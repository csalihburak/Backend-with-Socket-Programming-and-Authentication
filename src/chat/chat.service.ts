import { PrismaService } from "src/prisma/prisma.service";
import { channels, User } from "@prisma/client";
import { channelCommands } from './channel.commands';
import { Injectable } from "@nestjs/common";
import { chatUtils } from "./chat.utils";
import * as cryptojs from 'crypto-js';
import * as crypto from 'crypto';

interface messageStruct {
	id: number,
	sender: string,
	receiver: string,
	message: string,
	time: any,
};

interface channelMessages {
	id: number,
	sender: string,
	message: string,
	time: any,
}


@Injectable()
export class chatService {
	constructor ( public prisma: PrismaService, public commands: channelCommands, public utils: chatUtils) {}

	async getUser(sessionToken: any) : Promise<User> {
		if (sessionToken) {
			const session = await this.prisma.sessionToken.findFirst({
				where: {
					token: sessionToken,
				},
			});
			if (session) {
				const userId = session.userId;
				const user = await this.prisma.user.findUnique({
						where: {
							id: userId,
						},
					}).catch((error) => {
						console.log(error);
					});
				if (user) {
					return user;
				}
			} else {
				console.log('Session not found');
				return null;
			}
		}
		return null;
	}

	async getReceiver(sender: User, username: string) : Promise<{receiver: User, error: any}> {
		const receiver = await this.prisma.user.findUnique({
			where: {
				username: username,
			}
		});
		if (receiver) {
			if(receiver.blockedUsers.includes(sender.id)) {
				return {receiver: null, error: `user has been blocked by: ${receiver.username}`};
			}
			return {receiver: receiver, error: null};
		}
		return {receiver: null, error: "receiver not found!"};
	}

	async addMessageTodb(messageData: {sender: number, receiver: number, message: string}) {
		const encryptedMessage = cryptojs.AES.encrypt(messageData.message, process.env.SECRET_KEY).toString();
		const message = await this.prisma.messages.create({
			data: {
				senderId: messageData.sender,
				receiverId: messageData.receiver,
				message: encryptedMessage,
			}
		});
		return (message);
	}

	async getUsers(userId: number) {
		const users = await this.prisma.user.findMany({
			where: {
				NOT: {
					id: userId,
				}
			},
			select: {
				id: true,
				status: true,
				username: true,
				fullName: true,
				pictureUrl: true,
			}
		});
		if (users)
			return users;
		return null;
	}

	async getAllChannels(userId: number) : Promise<channels[]> {
		const channels = await this.prisma.channels.findMany({
			where: {
				userIds: {has: userId},
			}
		});
		return channels;
	}

	async createChannel(roomData: {roomName: string, password: string, priv: boolean }, user: User) : Promise<{channel: channels, error: any}> {
		if (roomData.password.length > 0) {
			roomData.password = crypto.createHash('sha256').update(roomData.password + process.env.SALT_KEY + "42&bG432/+").digest('hex');
		}
		const room = await this.prisma.channels.create({
			data: {
				ownerId: user.id,
				channelName: roomData.roomName,
				password: roomData.password,
				userIds: {set: user.id},
				adminIds: {set: user.id},
				public: roomData.priv,
			}
		}).catch(error => {
			if (error.code === 'P2002') {
				return { channel: null, error: `Room ${room.roomName} already exists.` };
			}
			  return {channel: null, error: error};
		});
		if (room) {
			room.password = null;
			return {channel: room, error: null};
		} else {
			console.log('Error creation of the room!');
			return {channel: null, error: "Error creation of the room!"};
		}
	}

	async joinChannel(userId: number, channelName: string, password: string) : Promise<{channel: channels, error: any}>{
		const channel = await this.utils.getChannel(channelName);
		if (channel) {
			if (!channel.userIds.includes(userId)) {
				if (!channel.BannedUsers.includes(userId)) {
					if (channel.password.length > 0) {
						password = crypto.createHash('sha256').update(password + process.env.SALT_KEY + "42&bG432/+").digest('hex');
						if (password !== channel.password) {
						  return { channel: null, error: 'Channel password is wrong!' };
						}
					}
					channel.userIds.push(userId);
					const updatedChannel = await this.prisma.channels.update({
						where: { id: channel.id },
						data: { userIds: { set: channel.userIds} }
					});
					return { channel: updatedChannel, error: null };
				} else {
					return {channel: null, error: `User banned from this channel: ${channelName}`};
				}
			} else {
				return {channel: null, error: `User already on the channel: ${channelName}`};
			}
		} else {
			return {channel: null, error: `No such a channel: ${channelName}`};
		}
	}

	async commandParse(user: User, message: string, channel: channels ) :  Promise<{messageData:{ id: number, message: string, time: string}, error: string }> {
		let commands = message.split(' ');
		if (commands[1].length <= 1 || commands[1] == user.username) {
			return {messageData: null, error: 'Invalid command syntax.'};
		}
		if (commands[0] !== '/invite'  &&  (!channel.adminIds.includes(user.id) && channel.ownerId !== user.id)) {
			return {messageData: null, error: 'You are not authorized to use this command.'};
		}
		switch (commands[0]) {
			case '/kick':
				return await this.commands.kickUser(user, commands[1], channel);
			case '/ban':
				return await this.commands.banUser(user, commands[1], channel,);
			case '/mute':
				return await this.commands.muteUser(user, commands[1], commands[2], channel);
			case '/pass':
				return await this.commands.channelPass(user, commands[1], channel);
			case '/mode':
				return await this.commands.userMode(user, commands[1], channel);
			case '/invite':
					return await this.commands.invite(user, commands[1], channel);
			default:
				return {messageData: null, error: 'Unknown command.'};
		}
	}

	async addFriend(userId: number, friendName: string) : Promise<{message: string, error: any}> {
		const friend = await this.prisma.user.findUnique({
			where: {
				username: friendName,
			}
		});
		if (friend) {
			if (!friend.friends.includes(userId)) {
				if (!friend.blockedUsers.includes(userId)) {
					const friendRequest = await this.prisma.friendRequest.create({
						data: {
							senderId: userId,
							receiverId: friend.id,
						},
					}).catch(error => {
						if (error.code === 'P2002') {
							return { message: null, error: `Friend request already been sent!` };
						} else {
							return { message: null, error: error };
						}
					});
					return {message: `Friend request has been sent to ${friend.username}`, error : null};
				} else {
					return {message: null, error : `User: ${friend} has blocked you.`};
				}
			} else {
				return {message: null, error : `User: ${friend} already your friend.`};
			}
		} else {
			return {message: null, error : `No such a user: ${friend}`};
		}
	}

	async respondRequest(user: User, friendName: string, accept: boolean) {
		const friend = await this.prisma.user.findUnique({
			where: {
				username: friendName,
			}
		});
		if (friend) {
			const request = await this.prisma.friendRequest.findFirst({
				where: {
					senderId: friend.id,
					receiverId: user.id,
				}
			});
			if (request) {
				if (accept === true) {
					const userUpdated = await this.prisma.user.update({
						where: {
							id: user.id,
						},
						data: {
							friends: {push: user.id},
						}
					});
					const friendUpdate = await this.prisma.user.update({
						where: {
							id: friend.id,
						},
						data: {
							friends: {push: friend.id},
						}
					});
					return {message: `User: ${friend.username} has been accepted your friend request.`, error: null};
				} else {
					return {message: `User: ${friend.username} has rejected your friend request.`, error: null};
				}
			} else {
				return {message: null, error : `No such a request`};
			}
		} else {
			return {message: null, error : `No such a user: ${friend}`};
		}
	}

	async parseMessage(user: User, senderId: number, message: string, channel: channels ) {
		if (message[0] === '/') {
			return {type: 1, data: await this.commandParse(user, message, channel)};
		} else {
			const encryptedMessage = cryptojs.AES.encrypt(message, process.env.SECRET_KEY).toString();
			let channelMessage = await this.prisma.channelMessages.create({
				data: {
					channelId: channel.id,
					senderId: user.username,
					message: encryptedMessage,
				}
			});
			return {type : 0 , data: {id: channelMessage.id, message: message, time: channelMessage.time, error: null } };
		}
	}

	async channelUsers(channel: channels) {
		const users = await this.prisma.user.findMany({
			where: {
				id: {in: channel.userIds},
			},
			select: {
				id: true,
				username: true,
				pictureUrl: true,
			}
		});
		return users;
	}
}
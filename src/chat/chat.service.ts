import { PrismaService } from "src/prisma/prisma.service";
import { channels, User, userMute } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import * as cryptojs from 'crypto-js';
import * as crypto from 'crypto';



interface messageStruct {
	id: number,
	sender: string,
	receiver: string,
	message: string,
	time: any,
};


@Injectable()
export class chatService {
	constructor ( public prisma: PrismaService,) {}

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
				stat: true,
				username: true,
				pictureUrl: true,
			}
		});
		if (users)
			return users;
		return null;
	}

	async getFriends(user: User): Promise<{channels: any[], friends: any[]}> {
		const friends = await this.prisma.user.findMany({
			where: {
				id: {in: user.friends},
			},
			select: {
				id: true,
				stat: true,
				pictureUrl: true,
			}
		}).catch(error => {
			console.log(error);
			console.log('Database error on getting friends');
		});
		const channels = await this.prisma.channels.findMany({
			where: {
				userIds: { has: user.id },
			}
		});
		if (friends && channels) {
			return {channels: channels, friends: friends };
		} else {
			console.log('error on getting friends');
			return null;
		}
	}

	async getMessages(user: User, username: string) {
		const friend = await this.prisma.user.findUnique({
			where: {
				username,
			}
		});
		if (friend) {
			if (user.friends.includes(friend.id)) {
				let msg : messageStruct[] = [];
				const messages = await this.prisma.messages.findMany({
					where: {
						senderId: user.id,
						receiverId: friend.id,
					},
				});
				messages.forEach((message, index)  => {
					msg[index].message = cryptojs.AES.decrypt(message.message, process.env.SECRET_KEY).toString(cryptojs.enc.Utf8);
					msg[index].sender = user.id === message.senderId ? user.username : username;
					msg[index].receiver = user.id === message.receiverId ? user.username : username;
					msg[index].time = message.time;
				});
				return { messages: msg, error: null };
			} else {
			return { messages: null, error : `User: ${username} is not your friend.` };
			}
		} else {
			return { messages: null, error : `No such a user: ${username}` };
		}
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
		const channel = await this.getChannel(channelName);
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

	async getChannel(channelName: string) : Promise<channels>{
		const room = this.prisma.channels.findUnique({
			where: {
				channelName: channelName,
			}
		});
		if (room) {
			return room;
		} else {
			console.log('no such a room on the server!');
			return null;
		}
	}

	async isUserAllowed(userId: number, channel: channels): Promise<number> {
		const userMuted = await this.prisma.userMute.findFirst({
			where: {
				userId: userId,
				channelsId: channel.id,
			}
		});
		if (channel.userIds.includes(userId)) {
			console.log('user not in the channel.');
			return (1);
		} else if (userMuted) {
			console.log(`user muted for ${ userMuted.mutedTime.getTime() - Date.now()} in this channel(${channel.channelName})`);
			return (2);
		} else if (channel.BannedUsers.includes(userId)) {
			console.log(`user banned from this channel(${channel.channelName})`)
			return (3);
		} else {
			return (0);
		}
	}

	async getTime(userId: number, channle: channels) {
		const mutedTime = await this.prisma.userMute.findFirst({
			where: {
				userId,
				channelsId: channle.id,
			},
		});
		if (mutedTime) {
			const date = new Date(mutedTime.mutedTime);
			return(date.toLocaleString());
		} else {
			console.log('error while getting getTime');
			return -1;
		}
	}

	async sendMessage(server: Server, client: Socket, channel: channels, message: any, user: any) {
		if (message.type === 1) {
			if (message.data.message) {
				server.to(channel.channelName).emit('channelCommand',{ sender: user, message: message.data.message });
			} else {
				client.emit('alert', message.data.error);
			}							
		} else {
			if (message.data.message) {
				server.to(channel.channelName).emit('channelMessage', {sender: user, message: message.data.message});
			} else { // could be a bug
				client.emit('alert', message.data.error);
			}
		}
	}

	async banUser(username: any, channel: channels) : Promise<{message: string, error: string }> {
		const user = await this.prisma.user.findUnique({
			where: {
				username,
			}
		});
		if(user) {
			if (channel.userIds.includes(user.id)) {
				if (channel.ownerId !== user.id) {
					channel.userIds.splice(channel.userIds.indexOf(user.id));
					channel.BannedUsers.push(user.id);
					const updateChannel = await this.prisma.channels.update({
						where: {
							id: channel.id,
						},
						data: {
							userIds: {set: channel.userIds},
							BannedUsers: {set: channel.BannedUsers}
						}
					});
					return {message : `User: ${username} has banned by: `, error: null };
				} else {
					return {message : null, error: 'Admins can not \'ban\' the owner of the channel!'};
				}
			} else {
				return {message : null, error :`User: ${username} not in the channel!`};
			}
		} else {
			return {message: null, error : `No such a user: ${username}`};
		}
	}

	async muteUser(username: any,  time: any,  channel: channels) : Promise<{message: string, error: string }> {
		const user = await this.prisma.user.findUnique({
			where: {
				username,
			}
		});
		if(user) {
			if (channel.userIds.includes(user.id)) {
				if (channel.ownerId !== user.id) {
					let minutes = parseInt(time);
					if ( [15, 30, 60].includes(minutes)) {
						const mutedTime = new Date();
						mutedTime.setMinutes(mutedTime.getMinutes() + minutes);
						const userMute = await this.prisma.userMute.create({
							data: {
								userId: user.id,
								channels: {connect: { id: channel.id }},
								mutedTime: mutedTime,
							}
						});
						const updatedChannel = await this.prisma.channels.update({
							where: {
								id: channel.id,
							},
							data: {
								mutedUsers: {connect: { id: userMute.id }}
							}
						});
						return {message: `User: ${user.username} muted for ${minutes} minut.`, error: null};
					} else {
						return {message: null, error: `Invalid mute time (${minutes}) please provide valid one!`};
					}
				} else {
					return {message : null, error: 'Admins can not \'mute\' the owner of the channel!'};
				}
			} else {
				return {message : null, error :`User: ${username} not in the channel!`};
			}
		} else {
			return {message: null, error : `No such a user: ${username}`};
		}
	}

	async kickUser(username: any, channel: channels) : Promise<{message: string, error: string }> {
		const user = await this.prisma.user.findUnique({
			where: {
				username,
			}
		});
		if(user) {
			if (channel.userIds.includes(user.id)) {
				if (channel.ownerId !== user.id) {
					channel.userIds.splice(channel.userIds.indexOf(user.id));
					const updateChannel = await this.prisma.channels.update({
						where: {
							id: channel.id,
						},
						data: {
							userIds: {set: channel.userIds},
						}
					});
					return {message : `User: ${username} has kicked by: `, error: null };
				} else {
					return {message : null, error: 'Admins can not \'kick\' the owner of the channel!'};
				}
			} else {
				return {message : null, error :`User: ${username} not in the channel!`};
			}
		} else {
			return {message: null, error : `No such a user: ${username}`};
		}
	}

	async channelPass( senderId: number, password: string, channel: channels ) : Promise<{message: string, error: string }> {
	
		if (senderId !== channel.ownerId) {
			return {message: null, error: 'Only the channel owner can set the channel password'};
		}
		password =  crypto.createHash('sha256').update(password + process.env.SALT_KEY + "42&bG432/+").digest('hex');
		const updatedChannel = await this.prisma.channels.update({
			where: {
				id: channel.id,
			},
			data: {
				password,
			}
		});
		return {message: `Channel (${channel.channelName}) updated!`, error: null}
	}

	async userMode(senderId: number, username: string, channel: channels) : Promise<{message: string, error: string }> {
		if (senderId !== channel.ownerId) {
			return {message: null, error: 'Only the channel owner can set the channel password'};
		}
		const user = await this.prisma.user.findUnique({
			where: {
				username,
			}
		});
		if(user) {
			if (channel.userIds.includes(user.id)) {
				channel.adminIds.push(user.id);
				const updateChannel = await this.prisma.channels.update({
					where: {
						id: channel.id,
					},
					data: {
						adminIds: { set: channel.userIds },
					}
				});
				return {message : `User: ${username} has now one of the channel admins!`, error: null };
			} else {
				return {message : null, error :`User: ${username} not in the channel!`};
			}
		} else {
			return {message: null, error : `No such a user: ${username}`};
		}

	}



	async commandParse(senderId: number, message: string, channel: channels ) : Promise<{message: string, error: string }> {
		if (!channel.adminIds.includes(senderId) && channel.ownerId !== senderId) {
			return {message: null, error: 'You are not authorized to use this command.'};
		}
		let commands = message.split(' ');
		if (commands[1].length <= 1) {
			return {message: null, error: 'Invalid command syntax.'};
		}
		switch (commands[0]) {
			case '/kick':
				return await this.kickUser(commands[1], channel);
			case '/ban':
				return await this.banUser(commands[1], channel);
			case '/mute':
				return await this.muteUser(commands[1], commands[2], channel);
			case '/pass':
				return await this.channelPass(senderId, commands[1], channel);
			case '/mode':
				return await this.userMode(senderId, commands[1], channel);
			default:
				return {message: null, error: 'Unknown command.'};
		}
	}

	async parseMessage(senderId: number, message: string, channel: channels ) : Promise<{type: number, data: {message: string, error: string} }> {
		if (message[0] === '/') {
			return {type: 1, data: await this.commandParse(senderId, message, channel)};
		} else {
			const encryptedMessage = cryptojs.AES.encrypt(message, process.env.SECRET_KEY).toString();
			let channelMessage = await this.prisma.channelMessages.create({
				data: {
					channelId: channel.id,
					senderId: senderId,
					message: encryptedMessage,
				}
			});
			return {type : 0 , data: { message: message, error: null } };
		}
	}
}
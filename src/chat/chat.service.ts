import { PrismaService } from "src/prisma/prisma.service";
import { channels, posts, User, userMute } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import * as cryptojs from 'crypto-js';
import * as crypto from 'crypto';
import * as utils from './channel.commands';

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
				status: true,
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
				status: true,
				pictureUrl: true,
				username: true,
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
				const messages = await this.prisma.messages.findMany({
					where: {
						OR: [
							{ senderId: user.id, receiverId: friend.id },
							{ senderId: friend.id, receiverId: user.id }
						]
					},
					orderBy: {
						time: 'asc',
					}
				});
				const msg : any[] = [];
 				messages.forEach((message, index)  => {
					let data : messageStruct = {
						id: index,
						message: cryptojs.AES.decrypt(message.message, process.env.SECRET_KEY).toString(cryptojs.enc.Utf8),
 						sender: user.id === message.senderId ? user.username : username,
						receiver: user.id === message.receiverId ? user.username : username,
						time: message.time,
					}
					msg.push(data);
				});
				return { messages: msg, error: null };
			} else {
			return { messages: null, error : `User: ${username} is not your friend.` };
			}
		} else {
			return { messages: null, error : `No such a user: ${username}` };
		}
	}


	async channelMessages(user: User, channelName: string) {
		const channel = await this.getChannel(channelName);
		if (channel) {
			if (channel.userIds.includes(user.id)) {
				if (!channel.BannedUsers.includes(user.id)) {
					const messages = await this.prisma.channelMessages.findMany({
						where: {
							channelId: channel.id,
						}
					});
					const msg : any[] = [];
					messages.forEach((message, index)  => {
						let data : channelMessages = {
							id: index,
							message: cryptojs.AES.decrypt(message.message, process.env.SECRET_KEY).toString(cryptojs.enc.Utf8),
							sender: message.senderId,
							time: message.time,
						}
						msg.push(data);
					});
					return { messages: msg, error: null };
				} else {
				return { messages: null, error : `User: ${user.username} banned from the channel: ${channelName}}`};
				}
			} else {
				return { messages: null, error : `User: ${user.username} not on the channel: ${channelName}}`};
			}
		} else {
			return { messages: null, error : `No such a channel: ${channelName}}` };
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
		if (!channel.userIds.includes(userId)) {
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
				server.to(channel.channelName).emit('channelMessage', {sender: user, message: message.data.message, time: message.data.time});
			} else {
				client.emit('alert', message.data.error);
			}
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

	async banUser(username: any, channel: channels) : Promise<{message: string, error: string }> {
		return await utils.banUser(username, channel, this.prisma);
	}

	async muteUser(username: any,  time: any,  channel: channels) : Promise<{message: string, error: string }> {
		return await utils.muteUser(username, time, channel, this.prisma)
	}

	async kickUser(username: any, channel: channels) : Promise<{message: string, error: string }> {
		return await utils.kickUser(username, channel, this.prisma);
	}

	async channelPass( senderId: number, password: string, channel: channels ) : Promise<{message: string, error: string }> {
		return await utils.channelPass(senderId, password, channel, this.prisma);
	}

	async userMode(senderId: number, username: string, channel: channels) : Promise<{message: string, error: string }> {
		return await utils.userMode(senderId, username, channel, this.prisma);
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

	async parseMessage(senderName: string, senderId: number, message: string, channel: channels ) {
		if (message[0] === '/') {
			return {type: 1, data: await this.commandParse(senderId, message, channel)};
		} else {
			const encryptedMessage = cryptojs.AES.encrypt(message, process.env.SECRET_KEY).toString();
			let channelMessage = await this.prisma.channelMessages.create({
				data: {
					channelId: channel.id,
					senderId: senderName,
					message: encryptedMessage,
				}
			});
			return {type : 0 , data: { message: message, time: channelMessage.time, error: null } };
		}
	}

	async createPost(user: User, postData: any) : Promise<{id: number, user: {fullName: string,  username: string, pictureUrl: string}, content: string, time: Date, likes: number, retweets: number }>{
		const post = await this.prisma.posts.create({
			data: {
				content: postData,
				userId: user.id,
				likes: 0,
				retweets: 0,
			}
		});
		return {id: post.id, user: {fullName: user.fullName, username: user.username, pictureUrl: user.pictureUrl }, content: postData, time: post.time, likes: 0, retweets: 0};
	}

	async gameHistory(userId: number) {
		const games = await this.prisma.gameHistory.findMany({
			where: {
				OR: [
					{ leftPlayerId: userId,},
					{ rightPlayerId: userId}
				],
			},
		});
		return (games);
	}

	async updatePost(data: any) : Promise<{error: any, post: posts}> {
		const post = await this.prisma.posts.findUnique({
			where: { id: data.id }
		});
		if (post) {
			const updatePost = await this.prisma.posts.update({
				where: {
					id: post.id,
				},
				data: {
					likes: post.likes + data.like,
					retweets: post.retweets + data.retweet,
				}
			});
			return {error: null, post: updatePost };
		} else {
			return {error: `Can not find the post with id: ${data.id}`, post: null}
		}
	}

	async profile(username: string) : Promise<{data: { friends: any[], matchHistory: any[], achievements: any[], posts: any[], stats: any }, error: any}>{
		const user = await this.prisma.user.findUnique({
			where: {
				username,
			}
		});
		if (user) {
			const friends = await this.prisma.user.findMany({
				where: {
					id: {in: user.friends},
				},
				select: {
					id: true,
					status: true,
					pictureUrl: true,
					username: true,
				}
			});
			const matchHistory = await this.prisma.gameHistory.findMany({
				where: {
					OR: [
						{leftPlayerId: user.id},
						{rightPlayerId: user.id},
					],
				},
			});
			const posts = await this.prisma.posts.findMany({
				where: {
					userId: user.id,
				}
			});
			return {data: {friends: friends, matchHistory: matchHistory, achievements: user.achievements, posts: posts, stats: {win: user.status, lost: user.lost, point: user.point} }, error: null}
		} else {
			return {data: null, error : `No such a user: ${username}`};
		}
	}

	async getAllPosts() {
		const posts = await this.prisma.posts.findMany({
			orderBy: {
				time: 'desc',	
			},
			include: {
				user: {
				  select: {
					username: true,
					fullName: true,
					pictureUrl: true,
				  },
				},
			  },
		});
		return posts;
	}

	async getAllChannels(userId: number) : Promise<channels[]> {
		const channels = await this.prisma.channels.findMany({
			where: {
				userIds: {has: userId},
			}
		});
		return channels;
	}
}
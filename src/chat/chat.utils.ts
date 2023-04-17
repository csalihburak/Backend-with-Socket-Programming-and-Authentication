import { PrismaService } from "src/prisma/prisma.service";
import { channels, User} from "@prisma/client";
import { Server, Socket } from "socket.io";
import * as cryptojs from 'crypto-js';
import { Injectable } from "@nestjs/common";

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
export class chatUtils {

    constructor(public prisma: PrismaService) {};
    
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
				return { messages: null, error : `User: ${user.username} banned from the channel: ${channelName}`};
				}
			} else {
				return { messages: null, error : `User: ${user.username} not on the channel: ${channelName}`};
			}
		} else {
			return { messages: null, error : `No such a channel: ${channelName}}` };
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
			if (userMuted.mutedTime.getTime() - Date.now() < 0) {
				const muted = await this.prisma.userMute.delete({
					where: {
						id: userMuted.id,
					}
				});
				return(0);
			} else {
				console.log(`user muted for ${ userMuted.mutedTime.getTime() - Date.now()} in this channel(${channel.channelName})`);
				return (2);
			}
		} else if (channel.BannedUsers.includes(userId)) {
			console.log(`user banned from this channel(${channel.channelName})`)
			return (3);
		} else {
			return (0);
		}
	}

    async sendMessage(server: Server, client: Socket, channel: channels, message: any, user: any) {
		if (message.type === 1) {
			if (message.data.messageData) {
				console.log(message.data.messageData);
				server.to(channel.channelName).emit('channelCommand', { id: message.data.messageData.id, sender: 'admin', message: message.data.messageData.message, gameHash: message.data.messageData.gameHash ? message.data.messageData.gameHash: null, time: message.data.messageData.time });
			} else {
				server.to(client.id).emit('alert', {code: 'info', message: message.data.error});
			}							
		} else {
			if (message.data.message) {
				server.to(channel.channelName).emit('channelMessage', { sender: user, message: message.data.message, time: message.data.time});
			} else {
				server.to(client.id).emit('alert', {code: 'danger', message: message.data.error});
			}
		}
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

}
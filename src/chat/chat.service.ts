import { PrismaService } from "src/prisma/prisma.service"
import { Injectable } from "@nestjs/common";
import { chatRooms, User } from "@prisma/client";
import * as crypto from 'crypto';


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
			if(receiver.blockedUsers.includes(sender.id)) { //user has been blocked by receiver
				return {receiver: null, error: `user has been blocked by: ${receiver.username}`};
			}
			return {receiver: receiver, error: null};
		}
		return {receiver: null, error: "receiver not found!"};
	}

	async addMessageTodb(messageData: {sender: number, receiver: number, message: string}) {
		const message = await this.prisma.messages.create({
			data: {
				senderId: messageData.sender,
				receiverId: messageData.receiver,
				message: messageData.message,
			}
		});
		return (message);
	}

	async createRooms(roomData: {roomName: string, password: string }, user: User) {
		if (roomData.password.length > 0) {
			roomData.password = crypto.createHash('sha256').update(roomData.password + process.env.SALT_KEY + "42&bG432/+").digest('hex');
		}
		const room = await this.prisma.chatRooms.create({
			data: {
				ownerId: user.id,
				roomName: roomData.roomName,
				password: roomData.password,
				userIds: {set: user.id},
				adminIds: {set: user.id},
			}
		}).catch(error => {
			if (error.code === 'P2002') {
				return JSON.stringify({ status: 403, message: `Room ${room.roomName} already exists.` });
			}
			  return (error);
		});
		if (room) {
			room.password = null;
			return (room);
		} else {
			console.log('Error creation of the room!');
			return null;
		}
	}

	async getRoom(roomName: string) : Promise<chatRooms>{
		const room = this.prisma.chatRooms.findUnique({
			where: {
				id: 1, //you have to change it
			}
		});
		if (room) {
			return room;
		} else {
			console.log('no such a room on the server!');
			return null;
		}
	}

	async isUserAllowed(userId: number, room: chatRooms): Promise<Boolean> { //check the user if banned or muted
		
		return
	}

	async parseMessage(message: string) {

	}
}
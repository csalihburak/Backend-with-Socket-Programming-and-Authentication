import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody } from '@nestjs/websockets';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { Game, stat, User } from '@prisma/client';
import { chatService } from './chat.service';

interface message {
	sender: string,
	receiver: string,
	messageTxt: string,
}

@WebSocketGateway({ namespace: '/socket/chat' })
export class chatGateAWay implements OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection {
	constructor(public chatService: chatService) {}
 	@WebSocketServer() server: Server;
	private logger: Logger = new Logger('chatGateway');
	users: Record<string, User> = {};

	afterInit(server: any) {
		this.logger.log('chat inithalized');
	}

	async handleConnection(client: Socket, ...args: any[]) {
		const sessionToken = client.handshake.query.sessionToken;
		const user = await this.chatService.getUser(sessionToken);
		if (user) {
			this.users[client.id] = user;
			client.join(user.username);
			console.log(`client connected on chatGateway: ${user.username}`);
		} else {
			console.log('Error! user not found on chatGateway connection');
		}
	}

	handleDisconnect(client: Socket) {
		const user = this.users[client.id];
		if (user) {
			console.log(`client disconnected: ${user.username}`);
			this.users[client.id] = null;
		}
	}

	@SubscribeMessage('privMessage')
	async privMessage(client: Socket, messageData: message) {
		const user = this.users[client.id];
		if (user) {
			const {receiver, error } = await this.chatService.getReceiver(user, messageData.receiver);
			if (receiver) {
				const message = await this.chatService.addMessageTodb({ sender: user.id, receiver: receiver.id, message: messageData.messageTxt })
				client.to(receiver.username).emit('privMessage', { sender: user.username, message: messageData.messageTxt, time: message.time });
			} else {
				console.log(error);
			}
		} else {
			console.log('user not found on privmsg');
		}
	}

	@SubscribeMessage('createRoom')
	async createRoom(client: Socket, roomData: {roomName: string, password: string}) {
		const user = this.users[client.id];
		if (user) {
			const room = await this.chatService.createRooms(roomData, user);
			if (room) {
				this.server.emit('roomCreated', room);
			}
		} else {
			console.log('user not found on room creation.');
		}
	}

	@SubscribeMessage('messageToRoom')
	async messageToRoom(client: Socket, message: any) {
		const user = this.users[client.id];
		if (user) {
			const room = await this.chatService.getRoom(message.roomName);
			if (room) {
				if (room.userIds.includes(user.id)) {
					
				} else { // burada bir alert atabiliriz
					console.log('user not in the channel.');
				}
			}
		} else {
			console.log('user not found on messageToRoom.');
		}
	}
}

import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { chatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { User } from '@prisma/client';

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

	@SubscribeMessage('createChannel')
	async createRoom(client: Socket, roomData: {roomName: string, password: string, priv: boolean}) {
		const user = this.users[client.id];
		if (user) {
			const room = await this.chatService.createChannel(roomData, user);
			if (room.channel) {
				this.server.emit('roomCreated', room);
			} else {
				client.emit('alert', room.error);
			}
		} else {
			console.log('user not found on room creation.');
		}
	}

	@SubscribeMessage('joinChannel')
	async joinChannel(client: Socket, data: {channelName: string, password: string }) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.chatService.joinChannel(user.id, data.channelName, data.password);
			if (result.channel) {
				const date = Date.now();
				this.server.to(data.channelName).emit('userJioned', { message: `User: ${user.username} has joinned the channel`, time: date.toLocaleString()});
			} else {
				client.emit('alert', result.error);
			}
		} else {
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}

	@SubscribeMessage('messageToRoom')
	async messageToRoom(client: Socket, messageData: any) {
		const user = this.users[client.id];
		if (user) {
			const channel = await this.chatService.getChannel(messageData.roomName);
			if (channel) {
				switch (await this.chatService.isUserAllowed(user.id, channel)) {
					case 0 :
						const message = await this.chatService.parseMessage(user.id, messageData.messageTxt, channel);
						await this.chatService.sendMessage(this.server, client, channel, message, user.username);
						break;
					case 1 : 
						client.emit('alert', `User: ${user.username} not on the channel.`)
						break;
					case 2 :
						let time = await this.chatService.getTime(user.id, channel);
						client.emit('alert', `You have been muted until ${time}.`);
						break;
					case 3 :
						client.emit('alert', `You have been banned from this channel.`);
						break;
					default :
						return;
				}
			}
		} else {
			console.log('user not found on messageToRoom.');
		}
	}
}

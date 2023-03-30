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

	@SubscribeMessage('userList')
	async getUsers(client: Socket, data: any) {

		const user = this.users[client.id];
		if (user) {
			const users = await this.chatService.getUsers(user.id);
			client.emit('userList', users);
		} else {
			console.log('error on userList');
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}

	@SubscribeMessage('friendList')
	async getFriends(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.chatService.getFriends(user);
			if (result) {
				client.emit('friendList', { channels: result.channels, friends: result.friends });
			} else {
				client.emit('alert', 'There is a error while getting the friendList');
			}
		} else {
			console.log('error on friendList');
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}

	@SubscribeMessage('addFriend')
	async addFriend(client: Socket, friendName: string) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.chatService.addFriend(user.id, friendName); // burada friende bir istek atabiliriz
			if (result.message) {
				client.emit('alert', result.message);
				this.server.to(friendName).emit('alert', `You have new friend request.`);
			} else {
				client.emit('alert', result.error);
			}
		} else {
			console.log('error on addFriend');
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}
	
	@SubscribeMessage('responseRequest')
	async respondRequest(client: Socket, data: { friendName: string, accept: boolean}) {
		const user = this.users[client.id];
		if (user) {
			const response = await this.chatService.respondRequest(user, data.friendName, data.accept);
			if (response.message) {
				client.emit('resposeRequest', response.message);
			} else {
				client.emit('alert', response.error);
			}
		} else {
			console.log('error on repondRequest');
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}

	@SubscribeMessage('messageList')
	async getMessages(client: Socket, friend: string) {
		const user = this.users[client.id];
		if (user) {
			console.log('test');
			const result = await this.chatService.getMessages(user, friend);
			if (result.messages) {
				return result.messages;
			} else {
				client.emit('alert', result.error);
			}
		} else {
			console.log('error on messageList');
			client.emit('alert', 'user not found please retry when the connection established!')
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
				client.emit('privMessage', { id: message.id, sender: user.username, receiver: receiver.username, message: messageData.messageTxt, time: message.time });
			} else {
				console.log(error);
			}
		} else {
			console.log('user not found on privmsg');
			client.emit('alert', 'user not found please retry when the connection established!')
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
				console.log(result);
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
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}

	@SubscribeMessage('gameHistory')
	async gameHistory(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			const games = await this.chatService.gameHistory(user.id);
			return (games);
		} else {
			console.log('user not found on gameHistory');
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}

	@SubscribeMessage('updatePost')
	async updatePost(client: Socket, data: {id: number, retweet: number, like: number}) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.chatService.updatePost(data);
			if (result.post) {
				let post = result.post;
				this.server.emit('postUpdated', {id: post.id, 
					author: user.fullName, username: user.username, pictureUrl: user.pictureUrl, 
					content: post.content, time: post.time, likes: post.likes, retweets: post.retweets});
			} else {
				client.emit('alert', result.error);
			}
		} else {
			console.log('user not found on updatePost');
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}
	
	@SubscribeMessage('createPost')
	async createPosts(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.chatService.createPost(user, data);
			this.server.emit('newPost', result);
		} else {
			console.log('user not found on createPost');
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}

	@SubscribeMessage('posts')
	async posts(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			return await this.chatService.getAllPosts();
		} else {
			console.log('user not found on posts');
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}

	@SubscribeMessage('profile')
	async achievements(client: Socket, username: string) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.chatService.profile(username);
			if (result.data) {
				return result.data;
			} else {
				client.emit('alert', result.error);
			}
		} else {
			console.log('user not found on profile');
			client.emit('alert', 'user not found please retry when the connection established!')
		}
	}

}

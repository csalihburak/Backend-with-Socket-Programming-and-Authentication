import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { chatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { chatUtils } from './chat.utils';
import { Logger } from '@nestjs/common';
import { webUtils } from './web.utils';
import { User } from '@prisma/client';

interface message {
	sender: string,
	receiver: string,
	messageTxt: string,
}

@WebSocketGateway({ namespace: '/socket/chat' })
export class chatGateAWay implements OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection {
	constructor(public chatService: chatService, public utils: chatUtils, public webUtils: webUtils) {}
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
			const userValues: User[] = Object.values(this.users);
			if (!userValues.includes(user)) {
				this.users[client.id] = user;
				client.join(user.username);
				const channels = await this.chatService.getAllChannels(user.id);
				channels.forEach((channel) => {
					client.join(channel.channelName);
				});
				console.log(`client connected on chatGateway: ${user.username}`);
			}
		} else {
			console.log('Error! user not found on chatGateway connection');
		}
	}

	async handleDisconnect(client: Socket) {
		const user = this.users[client.id];
		if (user) {
			const updatedUser = await this.chatService.updateUser(user.id);
			console.log(`client disconnected from chatGateway: ${user.username}`);
			this.users[client.id] = null;
		}
	}

	@SubscribeMessage('userList')
	async getUsers(client: Socket, data: any) {

		const user = this.users[client.id];
		if (user) {
			const users = await this.chatService.getUsers(user.id);
			return users;
		} else {
			console.log('error on userList');
			this.server.to(client.id).emit('alert', 'user not found please retry when the connection established!')
		}
	}

	@SubscribeMessage('friendList')
	async getFriends(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.utils.getFriends(user);
			if (result) {
				return  { channels: result.channels, friends: result.friends };
			} else {
				this.server.to(user.username).emit('alert', 'There is a error while getting the friendList');
			}
		} else {
			console.log('error on friendList');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('addFriend')
	async addFriend(client: Socket, friendName: string) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.chatService.addFriend(user, friendName);
			console.log(result);
			if (result.message) {
				this.server.to(user.username).emit('alert', {code: 'success', message: result.message});
				this.server.to(friendName).emit('alert', {code: 'info', message: `You have new friend request.`});
				return result.message;
			} else {
				this.server.to(user.username).emit('alert', {code: 'danger', message: result.error});
				return null;
			}
		} else {
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('blockUser')
	async blockUser(client: Socket, friendName: string) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.webUtils.blockUser(user, friendName);
			console.log(result);
			if (result.message) {
				this.server.to(user.username).emit('alert', {code: 'info', message: result.message});
			} else {
				this.server.to(user.username).emit('alert', {code: 'danger', message: result.error});
			}
		} else {
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('friendRequests')
	async friendRequests(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			return await this.webUtils.getFriendRequest(user);
		} else {
			console.log('user not found on friendList');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}
	
	@SubscribeMessage('responseRequest')
	async respondRequest(client: Socket, data: { friendName: string, accept: boolean}) {
		const user = this.users[client.id];
		if (user) {
			const response = await this.chatService.respondRequest(user, data.friendName, data.accept);
			if (response.message) {
				this.server.to(data.friendName).emit('alert', {code: 'success', message: response.message});
			} else {
				this.server.to(user.username).emit('alert', {code: 'danger', message: response.error});
			}
		} else {
			console.log('error on repondRequest');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('messageList')
	async getMessages(client: Socket, friend: string) {
		const user = this.users[client.id];
		if (user) {
			if (friend) {
				const result = await this.utils.getMessages(user, friend);
				if (result.messages) {
					return result.messages;
				} else {
					this.server.to(user.username).emit('alert', result.error);
				}
			} else {
				this.server.to(user.username).emit('alert', "Friend not found.");
			}
		} else {
			console.log('error on messageList');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('channelMessages')
	async channelMessages(client: Socket, channelName: any) {
		const user = this.users[client.id];
		if (user) {
			if (channelName) {
				const result = await this.utils.channelMessages(user, channelName);
				if (result.messages) {
					return result.messages;
				} else {
					this.server.to(user.username).emit('alert', {code: 'danger', message: result.error});
				}
			} else {
				this.server.to(user.username).emit('alert', {code : 'warning', message: "channel not found."});
			}
		} else {
			console.log('error on channelMessages');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
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
				client.to(receiver.username).emit('alert', { code: 'success', message: `you have a new message from ${user.username}`, });
				this.server.to(user.username).emit('privMessage',  { sender: user.username, message: messageData.messageTxt, time: message.time });
			} else {
				this.server.to(user.username).emit('alert',  { code: 'danger', message: error });
			}
		} else {
			console.log('user not found on privmsg');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('createChannel')
	async createRoom(client: Socket, roomData: {roomName: string, password: string, priv: boolean}) {
		const user = this.users[client.id];
		if (user) {
			const room = await this.chatService.createChannel(roomData, user);
			if (room.channel) {
				client.join(room.channel.channelName);
				client.emit('roomCreated', room);
			} else {
				this.server.to(user.username).emit('alert', { code:'warning', message: room.error });
			}
		} else {
			console.log('user not found on room creation.');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('channelUsers')
	async channelUsers(client: Socket, channelName: string) {
		const user = this.users[client.id];
		if (user) {
			const channel = await this.utils.getChannel(channelName);
			if (channel) {
				return await this.chatService.channelUsers(channel);
			} else {
				this.server.to(user.username).emit('alert', {code: 'danger', message: "No such a channel"});
			}

		} else {
			console.log('user not found on channelUsers.');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('joinChannel')
	async joinChannel(client: Socket, data: {channelName: string, password: string }) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.chatService.joinChannel(user.id, data.channelName, data.password);
			if (result.channel) {
				const date = Date.now().toLocaleString();
				client.join(data.channelName);
				this.server.to(data.channelName).emit('userJoined', { message: `User: ${user.username} has joinned the channel`, time: date.toLocaleString()});
			} else {
				this.server.to(user.username).emit('alert', { code:'warning', message: result.error });
			}
		} else {
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('messageToRoom')
	async messageToRoom(client: Socket, messageData: any) {
		const user = this.users[client.id];
		if (user) {
			const channel = await this.utils.getChannel(messageData.channelName);
			if (channel) {
				switch (await this.utils.isUserAllowed(user.id, channel)) {
					case 0 :
						const message = await this.chatService.parseMessage(user, user.id, messageData.messageTxt, channel);
						await this.utils.sendMessage(this.server, client, channel, message, user.username);
						break;
					case 1 : 
						this.server.to(user.username).emit('alert', `User: ${user.username} not on the channel.`)
						break;
					case 2 :
						let time = await this.utils.getTime(user.id, channel);
						this.server.to(user.username).emit('alert', {code: 'info', message: `You have been muted from ' ${channel.channelName} ' until ${time}.`});
						break;
					case 3 :
						this.server.to(user.username).emit('alert', {code: 'info', message: `You have been banned from this channel.`});
						break;
					default :
						return;
				}
			}
		} else {
			console.log('user not found on messageToRoom.');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('gameHistory')
	async gameHistory(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			const games = await this.webUtils.gameHistory(user.username);
			return (games);
		} else {
			console.log('user not found on gameHistory');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('updatePost')
	async updatePost(client: Socket, data: {id: number, retweet: number, like: number}) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.webUtils.updatePost(data);
			if (result.post) {
				let post = result.post;
				this.server.emit('postUpdated', {id: post.id, content: post.content, time: post.time, likes: post.likes, retweets: post.retweets});
			} else {
				this.server.to(user.username).emit('alert', result.error);
			}
		} else {
			console.log('user not found on updatePost');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}
	
	@SubscribeMessage('createPost')
	async createPosts(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.webUtils.createPost(user, data);
			this.server.emit('newPost', result);
		} else {
			console.log('user not found on createPost');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('posts')
	async posts(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			return await this.webUtils.getAllPosts();
		} else {
			console.log('user not found on posts');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('profile')
	async achievements(client: Socket, username: string) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.webUtils.profile(user, username);
			if (result.data) {
				this.server.to(client.id).emit('profile', result.data);
			} else if (!result.data && result.error) {
				this.server.to(client.id).emit('profile', null);
				return null;
			}else {
				this.server.to(client.id).emit('profile', result.error);
				this.server.to(user.username).emit('alert', result.error);
			}
		} else {
			console.log('user not found on profile');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('startGame')
	async startGame(client: Socket, gameHash: string) {
		const user = this.users[client.id];
		if (user) {
			const result = await this.webUtils.updateGame(user, gameHash);
			if (result.message) {
				return result.message;
			} else {
				this.server.to(user.username).emit('alert', result.error);
				return result.error;
			}
		} else {
			console.log('user not found on startGame');
			this.server.to(client.id).emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

}

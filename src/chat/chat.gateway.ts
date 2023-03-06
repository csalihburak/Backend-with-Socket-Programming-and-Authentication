/* import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {Injectable, NestMiddleware } from '@nestjs/common'

class User {
	id: string;
	username: string;
	socket: Socket;
}



@WebSocketGateway()
export class chatGateAWay
	implements OnGatewayInit, OnGatewayDisconnect
{
	  users: User[] = [];
    usernames = [];
    private connectedUsers: Record<string, any> = {};

	@WebSocketServer() server: Server;

	afterInit(server: Server) {
		console.log('Inıtialized.');
	}
    handleConnection(client: any, ...args: any[]) {
        const username = client.handshake.query.username;
        console.log(`Client connected: ${username}`);
        const user = new User();
        user.id = client.id;
        user.username = username;
        user.socket = client;
        this.connectedUsers[username] = client; 
        this.users.push(user);
        this.emitUserList(); 
      }


    handleDisconnect(client: any) {
        const username = client.handshake.query.username;
        console.log(`Client disconnected: ${username}`);
        delete this.connectedUsers[username];
        this.emitUserList();
      }
    
      private emitUserList() {
        const usernames = Object.keys(this.connectedUsers);
        this.server.emit('userList', usernames);
      }



	@SubscribeMessage('message')
	handleMessage(client: Socket, message) {
    console.log("test:");
		// Mesajı gönderen kullanıcıyı bul
		const user = this.users.find((user) => user.id === client.id);

        this.users.forEach(client => {
		    client.socket.emit('message', `${user.username}: ${message}`);
        });
	}
}
 */
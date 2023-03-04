import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

class User {
    id: string;
    username: string;
    socket: Socket;
};

@WebSocketGateway()
export class chatGateAWay implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

      
    users: User[] = [];
    
    @WebSocketServer() server : Server;

    afterInit(server: Server) {
        console.log('Inıtialized.');
    }    

    handleConnection(client: Socket, ...args: any[]) {
        console.log(`client connected:${client.id}`);
        const user = new User();
        user.id = client.id;
        user.socket = client;
      
        this.users.push(user);
    }

    handleDisconnect(client: Socket) {
        console.log(`client Disconnected:${client.id}`);
        const userIndex = this.users.findIndex(user => user.id === client.id);
        if (userIndex !== -1) {
          this.users.splice(userIndex, 1);
        }
    }

/*     @SubscribeMessage('chat message')
    handleMessage(client: Socket, message: string) {
    this.server.emit('chat message', message);
    } */

    @SubscribeMessage('chat message')
    handleMessage(client: Socket, message) {
    // Mesajı gönderen kullanıcıyı bul
    const user = this.users.find(user => user.id === client.id);

    // Mesajı alan kullanıcının soketini bul
    const recipient = this.users.find(user => user.username === message.recipient);
    if (recipient) {
        recipient.socket.emit('chat message', `${user.username}: ${message.text}`);
    }
}

    
}

import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService, User, Room } from './game.service';
import { Game, update, prup, prdown } from './gameUtils/game.struct';




@WebSocketGateway({namespace: '/game'})
export class GameGateaway implements OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection {
	constructor(public gameService: GameService) {}

	@WebSocketServer() server: Server;
	users: User[] = [];
	usernames = [];
	game = new Game();

	games: { [key: string]: Game } = {};
	connectedUsers: Record<string, Socket> = {};

	afterInit(server: Server) {
		console.log('Inıtialized.');
	}

	async handleConnection(client: any, ...args: any[]) {
		const user = await this.gameService.handleConnection(client, args);
		this.users.push(user);
	}

	async handleDisconnect(client: any) {
		const username = client.handshake.query.username;
		const user = await this.gameService.getClientById(client);
		for (let i = 0; i < user.rooms.length; i++) {
			if (user.rooms[i].game.rightPlayer.id == client.id || user.rooms[i].game.leftPlayer.id == client.id) {
				console.log(user.rooms[i].id);
				this.server.to(user.rooms[i].id).emit('stop');
			}
		}
		console.log(`Client disconnected: ${username}`);
	}


	@SubscribeMessage('prUp')
	async prup(client: Socket, key: any[]) {
		const user = await this.gameService.getClientById(client);
		if (user.room) {
			const room = await this.gameService.getRoomById(user.room.id);
		   const game = room.game;
		   if (game) {
			   if (client.id === game.leftPlayer.id) {
				   prup(game, key[0], 'left');
			   } else if (client.id === game.rightPlayer.id) {
				   prup(game, key[0], 'right');
			   }
			   update(room);
		   }
		}
	}
	
	@SubscribeMessage('prDown')
	async prdown(client: Socket, key: any[]) {
		const user = await this.gameService.getClientById(client);
		if (user.room) {
			const room = await this.gameService.getRoomById(user.room.id);
			const game = room.game;
			if (game) {
				if (client.id === game.leftPlayer.id) {
					prdown(game, key[0], 'left');
				} else if (client.id === game.rightPlayer.id) {
					prdown(game, key[0], 'right');
				}
				update(room);
			}
		}
	}

	@SubscribeMessage('update')
	async updatelocation(client: Socket, data: any[]) {
		const user = await this.gameService.getClientById(client);
		if (user) {
			const room = await this.gameService.getRoomById(user.room.id);
			this.gameService.getClientById(client).then((user) => {
				if (room.game)
					this.server.to(user.room.id).emit('update', {"ball": room.game.ball, "leftPlayer": room.game.leftPlayer, "rightPlayer": room.game.rightPlayer, "automated": true});	
				});
			update(room);
		}
	};

	@SubscribeMessage('start') // yönlerin isimlendirmeleri yanlış düzelt
	async connect(client: Socket, key: any[]) {
		const user = await this.gameService.getClientById(client);
		const room = await this.gameService.addRoom(key[0]);
		if (user && room) {
			user.rooms.push(room);
			room.users.push(user);
			user.room = room;
			room.game.leftPlayer.id = client.id;
			this.game.users[client.id] = user.username;
			room.game.leftPlayer.name = "Eyüp";
			this.games[client.id] = room.game;
			client.join(key[0]);
			return (room.game);
		}
	}

	@SubscribeMessage('state')
	async state(client: Socket, data: any[]) {
		client.emit('state', data[0]);
	}


	@SubscribeMessage('join')
	async joinGame(client: Socket, data: any[]) {
		const room = await this.gameService.getRoomById(data[0]);
		const user = await this.gameService.getClientById(client);
		console.log(room.users.length);
		if (user && room) {
			if (room.users.length != 2) {
				user.rooms.push(room);
				room.users.push(user);
				room.game.rightPlayer.id = client.id;
				room.game.rightPlayer.name = "Burak";
				client.join(room.id);
				this.games[client.id] = room.game;
				this.server.to(room.id).emit('startGame');
			} else {
				client.emit('state', (room.game));
			}
			this.server.to(room.id).emit('start');
			user.room = room;
			return (room.game);
		}
	}

	@SubscribeMessage('create')
	async createGame(client: Socket, data: any[]) {
		const room = await this.gameService.createGame(client, data);
		this.server.emit('userList', room.id);
	}
}

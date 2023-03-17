import { SubscribeMessage, WebSocketGateway, WebSocketServer, } from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { Game, User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { GameGateaway } from './game.gateaway';

@WebSocketGateway({
	namespace: '/socket/gameUtils',
	cors: {
		origin: 'http://142.93.104.99:3000',
		methods: ['GET', 'POST'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	},
})
export class GameUtilsGateway {
	constructor(public prisma: PrismaService, public gameService: GameService, public utils: GameGateaway) {}
	@WebSocketServer() server: Server;
	users: Record<string, User> = {};
	games: any[];

	afterInit(server: Server) {
		console.log('Initialized Game utils Socket');
	}

	async handleConnection(client: Socket) {
 		const query = client.handshake.query;
		let sessionToken: any = query.sessionToken;
		const user = await this.gameService.getUser(sessionToken);
		if (user) {
			this.users[client.id] = user;
			console.log(`client connected: ${user.username}`);
		} else {
			console.log('Error!');
		}
	}

	async handleDisconnect(client: Socket) {
		const user = this.users[client.id];
		if (user) {
			console.log(`client disconnected: ${user.username}`);
			this.users[client.id] = null;
		}
	}

	@SubscribeMessage('create')
	async createGame(client: Socket, data: any[]) {
		const user = this.users[client.id];
		if (user) {
			try {
				let game = await this.gameService.createGame(user, data);
				if (game) {
					let data = { name: game.gameId, hash: game.hash, userName: user.username, pictureUrl: `http://142.93.164.123:3000/${user.pictureUrl}`, gameStatus: game.status }
					//this.games.push(data);
					//this.server.emit('gameCreated', data);
					return JSON.stringify({ status: 200, gameHash: game.hash });
				}
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError) {
					if (error.code === 'P2002') {
						return JSON.stringify({ status: 403, message: 'Room already exist' });
					}
				}
				return error;
			}
		} else {
			console.log('User not found');
		}
	}

	@SubscribeMessage('join')
	async joinGame(client: Socket, data: any[]) {
		const user = this.users[client.id];
		let gameHash = data[0];
		let game = await this.gameService.getGame(gameHash);
		if (game) {
			this.gameService.updateGame(user, game).then((game) => {
				if (game) {
					this.server.emit('gameUpdated', {
						name: game.id,
						gameHash: game.hash,
						userName: user.username,
						pictureUrl: user.pictureUrl,
						gameStatus: game.status,
					});
					return JSON.stringify({ statu: 200, gameHash: game.hash });
				}
			});
		} else {
			return JSON.stringify({
				statu: 203,
				message: 'Game not found(Maybe is finished or never created)',
			});
		}
	}

	@SubscribeMessage('start')
	async firstStart(client: Socket, data: any) {
		return await this.utils.startGame(client, data, this.server);
	}

	@SubscribeMessage('prUp')
	async prup(client: Socket, key: any[]) {
		this.utils.prup(client, key, this.server);
	}

	@SubscribeMessage('prDown')
	async prdown(client: Socket, key: any[]) {
		this.utils.prdown(client, key, this.server);
	}

	@SubscribeMessage('update')
	async updatelocation(client: Socket, data: any[]) {
		this.utils.updatelocation(client, data, this.server);
	}

	@SubscribeMessage('sendMessage')
	async sendMessage(client: Socket, data: any[]) {
		this.utils.state(client, data, this.server);
	}



}

import { SubscribeMessage, WebSocketGateway, WebSocketServer, } from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { User } from '@prisma/client';
import { Prisma } from '@prisma/client';

@WebSocketGateway({
	namespace: '/socket/gameUtils',
	cors: {
		origin: 'http://142.93.164.123:3001',
		methods: ['GET', 'POST'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	},
})
export class GameUtilsGateway {
	constructor(public prisma: PrismaService, public gameService: GameService) {}
	@WebSocketServer() server: Server;
	users: Record<string, User> = {};

	afterInit(server: Server) {
		console.log('Initialized Game utils Socket');
	}

	async handleConnection(client: Socket) {
		const query = client.handshake.query;
		let sessionToken: any = query.sessionToken;
		this.gameService.getUser(sessionToken).then((user) => {
			if (user) {
				this.users[client.id] = user;
				console.log(`client connected: ${user.username}`);
			} else {
				console.log('Error!');
			}
		});
	}

	async handleDisconnect(client: Socket) {
		const user = this.users[client.id];
		this.users[client.id] = null;
		console.log(`client disconnected: ${user.username}`);
	}

	@SubscribeMessage('create')
	async createGame(client: Socket, data: any[]) {
		const user = this.users[client.id];
		if (user) {
			try {
				let game = await this.gameService.createGame(user, data);
				if (game) {
					this.server.emit('gameCreated', {
							name: game.id,
							gameHash: game.hash,
							userName: user.username,
							pictureUrl: user.pictureUrl,
							gameStatus: game.status,
						});
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
}

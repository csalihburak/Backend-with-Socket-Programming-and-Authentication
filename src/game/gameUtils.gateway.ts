import { SubscribeMessage, WebSocketGateway, WebSocketServer, } from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { Game, Stat, User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { GameGateaway } from './game.gateaway';


//Don't forget the add gameUpdate after disconnect 

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
	constructor(public prisma: PrismaService, public gameService: GameService, public utils: GameGateaway) {}
	@WebSocketServer() server: Server;
	users: Record<string, User> = {};
	games: any[] = [];

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

	async test(data: any) {
		this.games.push(data);
		this.server.emit('gameCreated', data);
	}

	@SubscribeMessage('create')
	async createGame(client: Socket, data: any[]) {
		const user = this.users[client.id];
		if (user) {
			try {
				let game = await this.gameService.createGame(user, data);
				if (game) {
					let data = { name: game.gameId, hash: game.hash, userName: user.username, pictureUrl: `http://142.93.164.123:3000/${user.pictureUrl}`, gameStatus: game.status }
					const bekle = await this.test(data);
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
		if (user) {
			let game = await this.gameService.getGame(gameHash);
			if (game) {
				const updatedGame = await this.gameService.updateGame(user, game);
				if (updatedGame) {
					console.log(updatedGame);
					return JSON.stringify({ status: 200, gameHash: game.hash });
				}
			} else {
				return JSON.stringify({
					statu: 203,
					message: 'Game not found(Maybe is finished or never created)',
				});
			}
		}
	}


	@SubscribeMessage('games')
	async getAllGames(client: Socket) {
		const user = this.users[client.id];
		if (user) {
			return (this.games);
		} else {
			console.log('User not found');
		}
	}

	@SubscribeMessage('endGame')
	async endGame(client: Socket, hash: any) {
		const user = this.users[client.id];
		if (user) {
			const game = this.gameService.getGame(hash);
			if (game) {
				for (let i = 0; i < this.games.length; i++) {
					if (this.games[i].hash == hash) {
						console.log(`${this.games[i].name} is deleted`);
						this.prisma.user.update({
							where: {
								id: user.id,
							},
							data: {
								stat: Stat.ONLINE,
							}
						})
						this.games.splice(i, 1);
						this.server.emit('updateGames', this.games);
						return;
					}
				}
			} else {
				console.log('Game not found');
			}
		} else {
			console.log('user not found');
		}
	}


	@SubscribeMessage('start')
	async firstStart(client: Socket, data: any) {
		const game = await this.utils.startGame(client, data, this.server);
		console.log(game);
		return;
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
		this.utils.message(client, data, this.server);
	}

}

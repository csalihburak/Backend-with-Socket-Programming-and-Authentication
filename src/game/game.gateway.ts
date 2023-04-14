import { SubscribeMessage, WebSocketGateway, WebSocketServer,} from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';
import { Game, stat, User } from '@prisma/client';
import { GameGateaway } from './gameUtils';
import { GameService } from './game.service';
import { Server, Socket } from 'socket.io';
import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/socket/gameUtils' })
export class GameUtilsGateway 
{
	constructor( public prisma: PrismaService, public gameService: GameService, public utils: GameGateaway ) {}
	@WebSocketServer() server: Server;
	private logger: Logger = new Logger('game');
	users: Record<string, User> = {};
	games: any[] = [];
	queue: User[] = []
	randomWords = require('random-words');


	afterInit(server: Server) {
		this.logger.log('Initialized Game utils Socket');
	}

	async handleConnection(client: Socket) {
		const query = client.handshake.query;
		let sessionToken: any = query.sessionToken;
		const user = await this.gameService.getUser(sessionToken);
		if (user) {
			this.users[client.id] = user;
			client.emit('updateGames', this.games);
			console.log(`client connected on gameGateway: ${user.username}`);
		} else {
			//client.emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'})
			console.log('Error! user not found on gameGateway connection');
		}
	}

	async handleDisconnect(client: Socket) {
		const user = this.users[client.id];
		if (user) {
			console.log(`client disconnected from gameGateway: ${user.username}`);
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
					let data = {
						name: game.gameId,
						hash: game.hash,
						userName: user.username,
						pictureUrl: `http://64.226.65.83:3000/${user.pictureUrl}`,
						gameStatus: game.status,
					};
					const bekle = await this.test(data);
					return JSON.stringify({ status: 200, gameHash: game.hash });
				}
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError) {
					if (error.code === 'P2002') {
						client.emit('alert', {code: 'danger', message: 'Room already exist'});
						return JSON.stringify({ status: 403, message: 'Room already exist' });
					}
				}
				client.emit('alert', {code: 'danger', message: error});
				return error;
			}
		} else {
			console.log('User not found');
			client.emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
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
					return JSON.stringify({ status: 200, gameHash: game.hash });
				}
			} else {
				return JSON.stringify({
					statu: 203,
					message: 'Game not found(Maybe is finished or never created)',
				});
			}
		} else {
			client.emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'})
		}
	}

	@SubscribeMessage('games')
	async getAllGames(client: Socket) {
		const user = this.users[client.id];
		if (user) {
			return this.games;
		} else {
			client.emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'});
		}
	}

	@SubscribeMessage('endGame')
	async endGame(client: Socket, hash: any) {
		const user = this.users[client.id];
		if (user) {
			const game = await this.gameService.getGame(hash);
			if (game) {
				if (user.id === game.leftPlayerId || user.id === game.rightPlayerId) {
					for (let i = 0; i < this.games.length; i++) {
						if (this.games[i].hash == hash) {
							console.log(`${this.games[i].name} is deleted`);
							this.prisma.user.update({
								where: {
									id: user.id,
								},
								data: {
									status: stat.ONLINE,
								},
							});
							this.games.splice(i, 1);
							this.server.emit('updateGames', this.games);
							this.server.emit('playerLeft', [user.username, 0]);
							return await this.prisma.game.delete({where: {id: game.id}});
						}
					}
				} else {
					this.prisma.game.update({
						where: {
							id: game.id,
						},
						data: {
							userIds: {},
						},
					});
					const users = await this.gameService.getUsers(game);
					this.server.to(hash).emit('newUser', users);
					this.prisma.user.update({
						where: {
							id: user.id,
						},
						data: {
							status: stat.ONLINE,
						},
					});
				}
			} else {
				console.log('Game not found');
				client.emit('alert', {code: 'danger', message: 'Game not found'});
			}
		} else {
			console.log('user not found');
			client.emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'})
		}
	}

	@SubscribeMessage('joinQueue')
	async joinQueue(client: Socket, data: any) {
		const user = this.users[client.id];
		if (user) {
			if (this.queue.length === 0) {
				console.log('first');
				console.log(user.username);
				this.queue.push(user);
				
				let gameName = this.randomWords({exactly: 9})[3];
				let game = await this.gameService.createGame(user, [gameName, 5, Math.round(Math.random()) + 1, true, -1]);
				if (game) {
					client.join(gameName);
					if (game) {
						let data = {
							name: game.gameId,
							hash: game.hash,
							userName: user.username,
							pictureUrl: `http://64.226.65.83:3000/${user.pictureUrl}`,
							gameStatus: game.status,
						};
						const bekle = await this.test(data);
					}
				}
			} else {
				const game = await this.prisma.game.findFirst({
					where: {
						rightPlayerId: -1,
					}
				});
				if (game) {
					console.log('second');
					console.log(user.username);
					const updatedGame = await this.gameService.updateGame(user, game);
					if (updatedGame) {
						//client.join(game.gameId);
						client.emit('matchFound', game.hash);
						this.utils.sleep(2000);
						this.server.to(game.gameId).emit('matchFound', game.hash);
					}
					this.queue.splice(0, 2);
					return;
				}
			}

		} else {
			console.log('user not found');
			client.emit('alert', {code: 'danger', message: 'user not found please retry when the connection established!'})
		}
	}

	@SubscribeMessage('start')
	async firstStart(client: Socket, data: any) {
		const game = await this.utils.startGame(client, data, this.server);
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

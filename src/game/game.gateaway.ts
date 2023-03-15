import { SubscribeMessage, WebSocketGateway, WebSocketServer, } from '@nestjs/websockets';
import { Game, User } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { gameStruct, update, prup, prdown } from './gameUtils/game.struct';

@WebSocketGateway({
	namespace: '/api/game',
	cors: {
		origin: 'http://142.93.164.123:3001',
		methods: ['GET', 'POST'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	},
})
export class GameGateaway {
	constructor(public gameService: GameService) {}
	@WebSocketServer() server: Server;
	games: Record<string, gameStruct> = {};
	users: Record<string, User> = {};

	afterInit(server: Server) {
		console.log('Initialized Game Socket');
	}

	async handleConnection(client: Socket) {
		const query = client.handshake.query;
		let sessionToken: any = query.sessionToken;
		let gameHash: any = query.gameHash;
		this.gameService.getGame(gameHash).then((game) => {
			if (game) {
				this.gameService.getUser(sessionToken).then((user) => {
					if (user) {
						this.users[client.id] = user;
						if (user.id == game.leftPlayerId) {
							client.join(gameHash);
							this.gameService.createGameWoptions(game, user.id)
								.then((newGame) => {
									this.games[gameHash] = newGame;
									client.emit('initalize', newGame);
									client.emit('newUser', user.pictureUrl);
								});
						} else if (user.id == game.rightPlayerId) {
							let play = this.games[gameHash];
							if (play) {
								play.rightPlayerId = user.id;
								this.server.to(gameHash).emit('initalize', play);
								this.server.to(gameHash).emit('newUser', user.pictureUrl);
								this.server.to(gameHash).emit('startGame');
							} else {
								console.log('Game not found'); // we can redirect the user to lobby
								return null;
							}
						} else {
							client.join(gameHash);
							client.emit('start');
							this.server.to(gameHash).emit('newUser', user.pictureUrl);
						}
					} else {
						console.log('User not found');
					}
				});
			} else {
				console.log('Game not found');
			}
		});
	}

	async handleDisconnect(client: Socket) {
		
	}

	@SubscribeMessage('prUp')
	async prup(client: Socket, key: any[]) {
		let user = this.users[client.id];
		if (user) {
			const game = this.games[key[0]];
			if (game) {
				if (client.id === game.leftPlayer.id) {
					prup(game, key[0], 'left');
				} else if (client.id === game.rightPlayer.id) {
					prup(game, key[0], 'right');
				}
				update(game);
			}
		}
	}

	@SubscribeMessage('prDown')
	async prdown(client: Socket, key: any[]) {
		let user = this.users[client.id];
		if (user) {
			const game = this.games[key[0]];
			if (game) {
				if (client.id === game.leftPlayer.id) {
					prdown(game, key[0], 'left');
				} else if (client.id === game.rightPlayer.id) {
					prdown(game, key[0], 'right');
				}
				update(game);
			}
		}
	}

	@SubscribeMessage('update')
	async updatelocation(client: Socket, data: any[]) {
		let user = this.users[client.id];
		if (user) {
			let game = this.games[data[0]];
			if (game) {
				this.server.to(data[0]).emit('update', { ball: game.ball, leftPlayer: game.leftPlayer, rightPlayer: game.rightPlayer,
				});
				update(game);
			} else {
				console.log("Game not found"); // and again redirect the user to 
			}
		} else {
			console.log("User not found"); // and again redirect the user to 
		}
	}

	@SubscribeMessage('sendMessage')
	async state(client: Socket, data: any[]) {
		let user = this.users[client.id];
		if (user) {
			this.server.to(data).emit('getMessage', [user.username, data[1], data[2]]);
		} else {
			console.log("User not found"); // and again redirect the user to 
		}
	}

	@SubscribeMessage('newUser')
	async set(client: Socket, data: any[]) {
		this.server.emit(
			'newUser',
			'https://cdn.intra.42.fr/users/b1ae9729487aa5e1461676416f6117c5/scoskun.png',
		);
	}

	@SubscribeMessage('gameStop')
	async createGame(client: Socket, data: any[]) {
/* 		const user = await this.gameService.getClientById(client);
		this.server.to(user.room.id).emit('stop'); */
	}
}

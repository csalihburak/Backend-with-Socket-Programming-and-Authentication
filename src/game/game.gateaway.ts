import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Game, User } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { gameStruct, update, prup, prdown } from './gameUtils/game.struct';

@WebSocketGateway({
	namespace: '/socket/game',
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
		let sessionToken: any = '670f8b01f1cbb74c6ee9d91062e951c18d9aabaa299669df5bbdd497bb30f9d3';
		let gameHash: any = query.gameHash;
		if (gameHash) {
			const game = await this.gameService.getGame(gameHash);
			if (game) {
				const user = await this.gameService.getUser(sessionToken);
				if (user) {
					this.users[client.id] = user;
					if (user.id == game.leftPlayerId) {
						client.join(gameHash);
					 	const newGame = await this.gameService.createGameWoptions( game,user.id, );
						if (newGame) {
							this.games[gameHash] = newGame;
							client.emit('initalize', newGame);
							this.server.to(gameHash).emit('newUser', 'http://142.93.164.123:3000/' + user.pictureUrl);
						}
						return JSON.stringify({status: 200, gameHash: gameHash})
					} else if (user.id == game.rightPlayerId) {
						let play = this.games[gameHash];
						if (play) {
							play.rightPlayerId = user.id;
							this.server.to(gameHash).emit('initalize', play);
							this.server.to(gameHash).emit('newUser', 'http://142.93.164.123:3000/' + user.pictureUrl,);
							this.server.to(gameHash).emit('startGame');
						} else {
							console.log('Game not found');
							client.emit('playerLeft', ['Game not found']);
							return null;
						}
					} else {
						client.join(gameHash);
						client.emit('start');
						this.server
							.to(gameHash)
							.emit('newUser', 'http://142.93.164.123:3000/' + user.pictureUrl);
					}
				} else {
					client.emit('playerLeft', ['User not found']);
				}
			} else {
				console.log('Game not found');
				client.emit('playerLeft', ['Game not found']);
			}
		}
	}

	async handleDisconnect(client: Socket) {
		const user = this.users[client.id];
		for (const key in this.games) {
			if (this.games.hasOwnProperty(key)) {
				const game = this.games[key];
				if (user.id == game.leftPlayerId || user.id == game.rightPlayerId) {
					this.server.to(key).emit('playerLeft');
				} else {
					this.server.to(key).emit('userLeft', [user.pictureUrl]);
				}
			}
		}
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
		} else {
			client.emit('playerLeft', ['User not found']);
		}
	}

	@SubscribeMessage('update')
	async updatelocation(client: Socket, data: any[]) {
		let user = this.users[client.id];
		if (user) {
			let game = this.games[data[0]];
			if (game) {
				this.server.to(data[0]).emit('update', { ball: game.ball, leftPlayer: game.leftPlayer, rightPlayer: game.rightPlayer });
				update(game);
				if (game.leftPlayer.score >= game.round) {
					this.server.to(data[0]).emit('endOfGame', game.leftPlayer.name);
					this.gameService.updateUser(game.leftPlayerId, true);
					this.gameService.updateUser(game.rightPlayerId, false);
				} else if (game.rightPlayer.score >= game.round) {
					this.server.to(data[0]).emit('endOfGame', game.rightPlayer.name);
					this.gameService.updateUser(game.rightPlayerId, true);
					this.gameService.updateUser(game.leftPlayerId, false);
				}
			} else {
				client.emit('playerLeft', ['Game not found']);
				console.log('Game not found');
			}
		} else {
			client.emit('playerLeft', ['User not found']);
			console.log('User not found');
		}
	}

	@SubscribeMessage('sendMessage')
	async state(client: Socket, data: any[]) {
		let user = this.users[client.id];
		if (user) {
			this.server .to(data).emit('getMessage', [ user.username, data[1], data[2] ]);
		} else {
			client.emit('playerLeft', ['User not found']);
			console.log('User not found');
		}
	}
}

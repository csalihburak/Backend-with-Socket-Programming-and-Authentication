import { Injectable } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Game, User } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { gameStruct, update, prup, prdown } from './gameUtils/game.struct';

@Injectable()
export class GameGateaway {
	constructor(public gameService: GameService) {}

	@WebSocketServer() server: Server;
	games: Record<string, gameStruct> = {};
	users: Record<string, User> = {};
	clients: Socket[] = [];

	async handleGameEnd(gameHash: any) {
		this.clients.forEach(user => {
			user.leave(gameHash);
		});
		this.games[gameHash] = null;
	}

	async startGame(client: Socket, query: any, server: any) {
		let sessionToken: any = query.sessionToken;
		let gameHash: any = query.gameHash;
		if (gameHash) {
			const game = await this.gameService.getGame(gameHash);
			if (game) {
				const user = await this.gameService.getUser(sessionToken);
				if (user) {
					this.users[client.id] = user;
					if (user.id == game.leftPlayerId) {
						client.join(gameHash);
					 	const newGame = await this.gameService.createGameWoptions( game,  client.id);
						if (newGame) {
							this.clients.push(client);
							newGame.status = 1;
							client.join(gameHash);
							newGame.leftPlayer.name = user.username;
							this.games[gameHash] = newGame;
							client.emit('initalize', newGame);
							client.emit('startGame');
							server.to(gameHash).emit('newUser', 'http://142.93.164.123:3000/' + user.pictureUrl);
						}
						return JSON.stringify({status: 200, gameHash: gameHash})
					} else if (user.id == game.rightPlayerId) {
						let play = this.games[gameHash];
						if (play) {
							client.join(gameHash);
							play.rightPlayerId = user.id;
							play.rightPlayer.id = client.id;
							play.rightPlayer.name = user.username;
							server.to(gameHash).emit('initalize', play);
							server.to(gameHash).emit('newUser', 'http://142.93.164.123:3000/' + user.pictureUrl);
							server.to(gameHash).emit('startGame');
						} else {
							console.log('Game not found');
							client.emit('playerLeft', ['Game not found']);
							return null;
						}
					} else {
						client.join(gameHash);
						client.emit('start');
						server
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

	async prup(client: Socket, key: any[], server: Server) {
		let user = this.users[client.id];
		if (user) {
			let game = this.games[key[0]];
			if (game) {
				if (client.id === game.leftPlayer.id) {
					game = prup(game, key[1], 'left');
				} else if (client.id === game.rightPlayer.id) {
					game = prup(game, key[1], 'right');
				}
				update(game);
			}
		}
	}

	async prdown(client: Socket, key: any[], server: Server) {
		let user = this.users[client.id];
		if (user) {
			let game = this.games[key[0]];
			if (game) {
				if (client.id === game.leftPlayer.id) {
					game = prdown(game, key[1], 'left');
				} else if (client.id === game.rightPlayer.id) {
					game = prdown(game, key[1], 'right');
				}
				update(game);
			}
		} else {
			client.emit('playerLeft', ['User not found']);
		}
	}

	async updatelocation(client: Socket, data: any[], server: Server) {
		let user = this.users[client.id];
		if (user) {
			let game = this.games[data[0]];
			if (game && game.status == 1) {
				if (game.leftPlayer.score >= game.round) {
					server.to(data[0]).emit('endOfGame', game.leftPlayer.name);
					this.gameService.updateUser(game.leftPlayerId, true);
					this.gameService.updateUser(game.rightPlayerId, false);
					server.to(data[0]).emit('endOfGame', game.leftPlayer.name);
					this.games[data[0]].status = 0;
					this.handleGameEnd(data[0]);
				} else if (game.rightPlayer.score >= game.round) {
					server.to(data[0]).emit('endOfGame', game.rightPlayer.name);
					this.gameService.updateUser(game.rightPlayerId, true);
					this.gameService.updateUser(game.leftPlayerId, false);
					server.to(data[0]).emit('endOfGame', game.rightPlayer.name);
					this.games[data[0]].status = 0;
					this.handleGameEnd(data[0]);
				}
				update(game);
				server.to(data[0]).emit('update', { ball: game.ball, leftPlayer: game.leftPlayer, rightPlayer: game.rightPlayer, map: game.map });
			} 	else {
				client.emit('playerLeft', ['Game is ended']);
			}
		}
	}

	async state(client: Socket, data: any[], server: Server) {
		let user = this.users[client.id];
		if (user) {
			server .to(data).emit('getMessage', [ user.username, data[1], data[2] ]);
		} else {
			client.emit('playerLeft', ['User not found']);
			console.log('User not found');
		}
	}
}

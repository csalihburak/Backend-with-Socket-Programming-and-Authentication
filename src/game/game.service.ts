import { PrismaService } from 'src/prisma/prisma.service';
import { User, Game, stat } from '@prisma/client';
import { gameStruct } from './gameUtils/game.struct';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class GameService {
	constructor(public prisma: PrismaService) {}

	async getUser(sessionToken: string): Promise<User> {
		if (sessionToken) {
			const session = await this.prisma.sessionToken.findFirst({
				where: {
					token: sessionToken,
				},
			});
			if (session) {
				const userId = session.userId;
				const user = await this.prisma.user.findUnique({
						where: {
							id: userId,
						},
					}).catch((error) => {
						console.log(error);
					});
				if (user) {
					return user;
				}
			} else {
				console.log('Session not found');
				return null;
			}
		}
		return null;
	}

	async getUsers(game: Game): Promise<any[]> {
		const pictures = [];
		const gameUsers = await this.prisma.game.findUnique({
			where: {
				id: game.id,
			},
			select: {
				userIds: true,
			},
		});
		const users = await this.prisma.user.findMany({
			where: {
				id: { in: gameUsers.userIds },
			},
			select: {
				pictureUrl: true,
			},
		});
		users.forEach((user) => {
			pictures.push(`http://64.226.65.83:3000/${user.pictureUrl}`);
		});
		return pictures;
	}

	async createGameWoptions(game: Game, userId: string, user: User): Promise<gameStruct> {
		const newGame = new gameStruct();
		newGame.status = 1;
		newGame.map = game.map;
		newGame.round = game.round;
		newGame.name = game.gameId;
		newGame.leftPlayerId = user.id;
		newGame.leftPlayer.id = userId;
		newGame.leftPlayer.name = user.username;
		return newGame;
	}

	async createGame(user: User, data: any[]): Promise<Game> {
		let hash = crypto.createHash('sha256').update(data[0] + data[1] + '42&gamesuhdawuıdhıuwaghdıuyaw').digest('hex');
		const game = await this.prisma.game.create({
				data: {
					gameId: data[0],
					leftPlayerId: user.id,
					rightPlayerId: data[4],
					round: data[1],
					map: data[2],
					private: data[3],
					hash,
					status: 1,
					userIds: [user.id],
					userCount: 0,
				},
			}).catch((error) => {
				throw error;
			});
		if (game) {
			await this.prisma.user.update({
				where: { id: user.id },
				data: {
					status: stat.IN_GAME,
					played: user.played + 1,
				},
			});
			return game;
		} else {
			console.log('Error in game creation.');
		}
		return null;
	}

	async updateGame(user: User, game: Game): Promise<Game> {
		if (game.userCount == 0) {
			const updatedGame = await this.prisma.game.update({
					where: { id: game.id },
					data: {
						rightPlayerId: user.id,
						userCount: 1,
						userIds: { push: user.id },
						status: 2,
					},
				}).catch((error) => {
					console.log('Error while joining for play');
					return null;
				});
			return updatedGame;
		} else {
			const updatedGame = await this.prisma.game
				.update({
					where: { id: game.id },
					data: {
						userCount: game.userCount + 1,
						userIds: { push: user.id },
					},
				})
				.catch((error) => {
					console.log('Error while joining for watch');
					return null;
				});
			return updatedGame;
		}
	}

	async getGame(hash: string): Promise<Game> {
		const game = await this.prisma.game.findUnique({
			where: { hash: hash },
		});
		if (game) {
			return game;
		} else {
			console.log('Error while getting game');
			return null;
		}
	}

	async updateUser(userId: number, won: boolean) {
		const user = await this.prisma.user.findFirst({
				where: {
					id: userId,
				},
			}).catch((error) => {
				console.log('Error updating user after game ended!');
				console.log(error);
			});
		if (user) {
			let data = {
				won: user.won,
				lost: user.lost,
				row: user.row,
				point: user.point,
				achievements: user.achievements,
				status: stat.ONLINE,
			};
			if (won) {
				data.won = user.won + 1;
				data.point = user.point + 3;
				data.row = user.row + 1;
				if (user.played === 1) {
					data.achievements.push('First Blood');
				} else if (data.row === 5) {
					data.achievements.push('Streak Master');
				} else if (data.row === 10) {
					data.achievements.push('Pong Pro');
				}
			} else {
				data.lost = user.lost + 1;
				data.row = 0;
			}
			const updatedUser = await this.prisma.user.update({
					where: { id: user.id },
					data,
				})
				.catch((error) => {
					console.log(error);
			});
		}
	}

	async addGameHistory(game: gameStruct, user: User) {
		const ach = user.achievements;
		const otherPlayer = await this.prisma.user.findUnique({
			where: {
				username: game.leftPlayer.name === user.username ? game.rightPlayer.name : "",
			}, 
		});
		const history = await this.prisma.gameHistory.create({
			data: {
				leftPlayer: game.leftPlayer.name,
				rightPlayer: game.rightPlayer.name,
				leftPlayerScore: game.leftPlayer.score,
				rightPlayerScore: game.rightPlayer.score,
				leftPlayerImg: game.leftPlayer.name === user.username ? user.pictureUrl : otherPlayer.pictureUrl,
				rightPlayerImg: game.rightPlayer.name === user.username ? user.pictureUrl : otherPlayer.pictureUrl,
			},
		});
		let hash = crypto.createHash('sha256').update(game.name + game.round + '42&gamesuhdawuıdhıuwaghdıuyaw').digest('hex');
		this.prisma.game.delete({where: {hash: hash}});
		if (game.rightPlayer.score === 0) {
			ach.push('No mercy');
			const result = this.prisma.user.update({
				where: {
					id: game.rightPlayerId,
				},
				data: {
					achievements: ach,
				},
			});
		} else if (game.leftPlayer.score === 0) {
			ach.push('No mercy');
			const result = this.prisma.user.update({
				where: {
					id: game.leftPlayerId,
				},
				data: {
					achievements: ach,
				},
			});
		}
	}
}

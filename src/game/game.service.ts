import { PrismaService } from 'src/prisma/prisma.service';
import { gameStruct } from './gameUtils/game.struct'
import { User, Game, Stat} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto'

@Injectable()
export class GameService {
    constructor(public prisma: PrismaService) {}

    async getUser(sessionToken: string) : Promise<User>{
        if (sessionToken) {
			const session = await this.prisma.sessionToken.findFirst({
				where: {
					token: sessionToken,
				}
			});
			if (session) {
                const userId = session.userId;
				const user = await this.prisma.user.findUnique({
                    where: {
                        id: userId,
					}
				}).catch(error => {
                    console.log(error);
                })
				if (user) {
					return user;
				}
			} else {
				console.log("Session not found"); // burada kullanıcıya bir hata döndürüp üç saniye içinde giriş sayfasına yönlendirelim
                return null
			}
		}
        return null;
    }

    async getUsers(game : Game) : Promise<any[]>{ 
        const pictures = [];
        const gameUsers = await this.prisma.game.findUnique({
            where: {
                id: game.id,
            },
            select: {
                userIds: true,
            }
        });
        const users = await this.prisma.user.findMany({
            where: {
                id: {in: gameUsers.userIds},
            },
            select: {
                pictureUrl: true,
            }
        });
        users.forEach(user => {
            pictures.push(`http://64.226.65.83:3000/${user.pictureUrl}`)
        });
        return pictures;
    }



    async createGameWoptions(game: Game, userId: string) : Promise<gameStruct> {
        const newGame = new gameStruct();
        newGame.map = game.map;
        newGame.round = game.round;
        newGame.leftPlayer.id = userId;
        newGame.name = game.gameId;
        return newGame;
    }


    async createGame(user: User, data: any[]) : Promise<Game> {
        let hash = await crypto.createHash('sha256').update( data[0] + data[1] + data[3]+ "42&gamesuhdawuıdhıuwaghdıuyaw").digest('hex');
        const game = await this.prisma.game.create({
            data: {
                gameId: data[0],
                leftPlayerId: user.id,
                rightPlayerId: 0,
                round: data[1],
                map: data[2],
                private: data[3],
                hash,
                status: 1,
                userIds: [user.id],
                userCount: 0,
            }
        }).catch(error => {
            throw error;
        });
        if (game) {
            await this.prisma.user.update({
                where: { id: user.id, },
                data: { 
                    stat: Stat.IN_GAME, 
                    played: user.played + 1 
                }
            });
            return game;
        } else {
            console.log("Error in game creation.");
        }
        return null;
    }


    async updateGame(user: User, game: Game) : Promise<Game> {
        if (game.userCount == 0) {
            const updatedGame = await this.prisma.game.update({
                where: { id: game.id },
                data: {
                    rightPlayerId: user.id,
                    userCount: 1,
                    userIds: {push: user.id},
                    status: 2,
                },
            }).catch(error => {
                console.log("Error while joining for play");
                return null;
            });
            return updatedGame;
        }  else {
            const updatedGame = await this.prisma.game.update({
                where: { id: game.id },
                data: {
                    userCount: game.userCount + 1,
                    userIds: {push: user.id},
                }
            }).catch(error => {
                console.log("Error while joining for watch");
                return null;
            });
            return updatedGame;
        }
    }

    async getGame(hash: string) : Promise<Game> {
        const game = await this.prisma.game.findUnique({
            where: { hash: hash },
        });
        if (game) {
            return game;
        }
        else {
            console.log("Error while getting game");
            return null;
        }
    }

    async updateUser(userId: number, won: boolean) {
        const user = await this.prisma.user.findFirst({
            where: {
                id: userId,
            },
        }).catch(error => {
            console.log("Error updating user after game ended!");
            console.log(error);
        })
        if (user) {
            let win, lost, point = 0;
            let data = won ? {won: user.won + 1, lost: user.lost, stat: Stat.ONLINE} : 
            {won: user.won, lost: user.lost + 1, stat: Stat.ONLINE };
            if (won) {
                win = user.won + 1;
                point = user.point + 3;
            } else 
                lost = user.lost + 1;
            const updatedUser = await this.prisma.user.update({
                where: { id: user.id, },
                data: {
                    won: win,
                    lost: lost,
                    stat: Stat.ONLINE,
                    point: point,
                },
            }).catch(error => {
                console.log(error);
            })
        }
    }
}
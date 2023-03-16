import { gameStruct } from './gameUtils/game.struct'
import { User, Game, Stat} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io'
import * as crypto from 'crypto'


@Injectable()
export class GameService {

    constructor(public prisma: PrismaService, ) {}

    async getUser(sessionToken: string) : Promise<User>{
        if (sessionToken) {
			const session = await this.prisma.sessionToken.findFirst({
				where: {
					token: sessionToken,
				}
			});
            console.log()
			if (session) {
				const userId = session.userId;
				const user = await this.prisma.user.findUnique({
					where: {
						id: userId,
					}
				});
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


    async createGameWoptions(game: Game, userId: number) : Promise<gameStruct> {
        const newGame = new gameStruct();
        newGame.map = game.map;
        newGame.round = game.round;
        newGame.leftPlayerId = userId;
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
                userCount: 0,
            }
        }).catch(error => {
            throw error;
        });
        if (game) {
            this.prisma.user.update({
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
        if (game.userCount == 1) {
            this.prisma.game.update({
                where: { id: game.id },
                data: {
                    rightPlayerId: user.id,
                    userCount: 2,
                    status: 2,
                },
            }).then((game) => {
                
                return 
            }).catch(error => {
                console.log("Error while joining for play");
                return null;
            });
        } else {
            this.prisma.game.update({
                where: { id: game.id },
                data: { userCount: game.userCount + 1 }
            }).then(game => {
                return JSON.stringify({statu: 200, gameHash: game.hash});
            }).catch(error => {
                console.log("Error while joining for watch");
                return null;
            });
            return null;
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
        return null;
    }

    async updateUser(userId: number, won: boolean) {
        this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                won: true,
                lost: true,
            }
        }).then(user => {
            let data = won ? {won: user.won + 1, lost: user.lost, stat: Stat.ONLINE} : 
            {won: user.won, lost: user.lost + 1, stat: Stat.ONLINE };
            this.prisma.user.update({
                where: { id: userId, },
                data,
            });
        }).catch(error => {
            console.log("Error updating user after game ended!");
            console.log(error);
        })
    }
}
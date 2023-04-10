import { PrismaService } from "src/prisma/prisma.service";
import { posts, User } from "@prisma/client";
import { Injectable } from "@nestjs/common";

interface data {
	name: string,
	username: string,
	pictureUrl: string,
	time: string,
};



@Injectable()
export class webUtils{

    constructor(public prisma: PrismaService) {};

	async createPost(user: User, postData: any) : Promise<{id: number, user: {fullName: string,  username: string, pictureUrl: string}, content: string, time: Date, likes: number, retweets: number }>{
		const post = await this.prisma.posts.create({
			data: {
				content: postData,
				userId: user.id,
				likes: 0,
				retweets: 0,
			}
		});
		return {id: post.id, user: {fullName: user.fullName, username: user.username, pictureUrl: user.pictureUrl }, content: postData, time: post.time, likes: 0, retweets: 0};
	}

	async gameHistory(username: string) {
		const games = await this.prisma.gameHistory.findMany({
			where: {
				OR: [
					{ leftPlayer: username,},
					{ rightPlayer: username}
				],
			},
		});
		return (games);
	}

	async updatePost(data: any) : Promise<{error: any, post: posts}> {
		const post = await this.prisma.posts.findUnique({
			where: { id: data.id }
		});
		if (post) {
			const updatePost = await this.prisma.posts.update({
				where: {
					id: post.id,
				},
				data: {
					likes: post.likes + data.like,
					retweets: post.retweets + data.retweet,
				}
			});
			return {error: null, post: updatePost };
		} else {
			return {error: `Can not find the post with id: ${data.id}`, post: null}
		}
	}

	async profile(username: string) : Promise<{data: { img: string, friends: any[], matchHistory: any[], achievements: any[], posts: any[], stats: any }, error: any}>{
		const user = await this.prisma.user.findUnique({
			where: {
				username,
			}
		});
		if (user) {
			const friends = await this.prisma.user.findMany({
				where: {
					id: {in: user.friends},
				},
				select: {
					status: true,
					pictureUrl: true,
					username: true,
				}
			});
			const matchHistory = await this.prisma.gameHistory.findMany({
				where: {
					OR: [
						{leftPlayer: user.username},
						{rightPlayer: user.username},
					],
				},
			});
			const posts = await this.prisma.posts.findMany({
				where: {
					userId: user.id,
				},
				include: {
					user: {
					  select: {
						username: true,
						fullName: true,
						pictureUrl: true,
					  },
					},
				  },
			});
			return {data: {img: user.pictureUrl, friends: friends, matchHistory: matchHistory, achievements: user.achievements, posts: posts, stats: {win: user.won, lost: user.lost, point: user.point} }, error: null}
		} else {
			return {data: null, error : `No such a user: ${username}`};
		}
	}

	async getAllPosts() {
		const posts = await this.prisma.posts.findMany({
			orderBy: {
				time: 'desc',	
			},
			include: {
				user: {
				  select: {
					username: true,
					fullName: true,
					pictureUrl: true,
				  },
				},
			  },
		});
		return posts;
	}

	async updateGame(user: User, gameHash: string): Promise<{ message: string | null, error: any }> {
		const game = await this.prisma.game.findUnique({
			where: {
				hash: gameHash,
			},
		});
		if (!game) {
			return { message: null, error: `Game not found` };
		}
		let updatedGame;
		if (game.leftPlayerId === 0) {
			updatedGame = await this.prisma.game.update({
				where: {
					hash: gameHash,
				},
				data: {
					leftPlayerId: user.id,
				},
			});
		} else {
			updatedGame = await this.prisma.game.update({
				where: {
					hash: gameHash,
				},
				data: {
					rightPlayerId: user.id,
				},
			});
		}
		console.log(updatedGame);
		return { message: `Game updated`, error: null };
	}

	async getFriendRequest(user: User) {

		const notifications = [];

		const requests = await this.prisma.friendRequest.findMany({
			where: {
				receiverId: user.id,
			}
		});
		const userIds = [];
		requests.forEach((request, index) => {
			let dat : data = {	
				name: "",
				pictureUrl:  "",
				username: "",
				time: request.time.toLocaleString(),
			}
			notifications[index] = dat;
			userIds.push(request.senderId);
		});
		const users = await this.prisma.user.findMany({
			where: {
				id: {in: userIds},
			}
		});

		users.forEach((users, index) => {
			let dat : data = {
				name: users.fullName,
				username: user.username,
				pictureUrl:  users.pictureUrl,
				time: notifications[index].time,
			}
			notifications[index] = dat;
		});
		return notifications;
	}
}
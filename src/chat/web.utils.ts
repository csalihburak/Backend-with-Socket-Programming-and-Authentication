import { PrismaService } from "src/prisma/prisma.service";
import { posts, User } from "@prisma/client";
import { Injectable } from "@nestjs/common";

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

	async gameHistory(userId: number) {
		const games = await this.prisma.gameHistory.findMany({
			where: {
				OR: [
					{ leftPlayerId: userId,},
					{ rightPlayerId: userId}
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

	async profile(username: string) : Promise<{data: { friends: any[], matchHistory: any[], achievements: any[], posts: any[], stats: any }, error: any}>{
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
						{leftPlayerId: user.id},
						{rightPlayerId: user.id},
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
			return {data: {friends: friends, matchHistory: matchHistory, achievements: user.achievements, posts: posts, stats: {win: user.won, lost: user.lost, point: user.point} }, error: null}
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
}
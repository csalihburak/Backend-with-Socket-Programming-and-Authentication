import { startTransaction, validateUser, check, userCheck, getSession, sendCode, getUserData, parseData, codeValidation } from './utils/index'
import { PrismaService } from 'src/prisma/prisma.service';
import { Game, PrismaClient} from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthService {
	prismaClient = new PrismaClient();
	constructor(public prisma: PrismaService, private readonly mailerService: MailerService) {}

	async intraGet(code: string, req: Request) {
		try {
			const [data, callback] = await getUserData(code);
			const info = await parseData(data.data, callback as string);
			const res = await startTransaction(this.prisma, info, req, this.prismaClient);
			return res;
		} catch (error) {
			if (error.code == 'ERR_BAD_REQUEST')
				return JSON.stringify({ status: 401, error: 'invalid_grant', message: process.env.ERROR_401 });
			return error; 
		}
	}

	async singup(body: any, file: Express.Multer.File) {
		try {
			const info = await check(body);
			body.info = info;
			const user = await validateUser(body, file, this.prisma, this.prismaClient);
			return user;
		} catch (error) {
			return error;
		}
	}

	async signIn(req: Request) {
		try {
			return userCheck(req, this.prisma);
		} catch (error) {
			return error;
		}
	}

	async sendValidationCode(req) {
		try {
			const user = await getSession(req.body.sessionToken, this.prisma);
			if (user.two_factor_auth) {
				let validCode = Math.floor((Math.random() * 9999) + 1000);
				await sendCode({
					user: user,
					loginIp: req.ip.split(':')[3],
					url: req,
					browser: req.useragent.browser,

				}, validCode, this.mailerService, this.prisma);
				return JSON.stringify({status: 403, message: "Email sent succesfully.", email: user.email});
			} else {
				return JSON.stringify({status: 403, message: "User not enabled 2-Factor Authantication."});
			}
		} catch (error) {
			return error;
		}
	}

	async validateCode(req) {
		try {
			console.log(req.body);
			if (!req.body.email) {
				return JSON.stringify({status: 403, message: "Mail adresini kontrol ediniz."})
			} else if (!req.body.code) {
				return JSON.stringify({status: 403, message: "Doğrulama kodunu kontrol ediniz."})
			} else {
				return codeValidation(req.body.email, parseInt(req.body.code), this.prisma);
			}
		} catch (error) {
			return error;
		}
	}

	async leaderBord(sessionToken: any) {
		const session = await this.prisma.sessionToken.findFirst({
			where: {
				token: sessionToken,
			},
		});
		if (session) {
			const users = await this.prisma.user.findMany({
				take: 10,
				orderBy: {
					point: 'desc',
				},
				select: {
					username: true,
					won: true,
					lost: true,
					point: true,
					status: true,
				},
			});
			if (users) {
				return JSON.stringify({status: 200, users: users});
			} else {
				console.log('hata: service 102');
				return JSON.stringify({status: 501, message: "Something went wrong"});
			}
		} else {
			return JSON.stringify({status: 404, message: "Session not found."});
		}

	}

	async getUser(sessionToken: any) {
		const session = await this.prisma.sessionToken.findFirst({
			where: {
				token: sessionToken,
			},
		});
		if (session) {
			const user = await this.prisma.user.findUnique({
				where : {
					id: session.userId,
				},
				select: {
					username: true,
					pictureUrl: true,
				}
			});
			if (user) {
				return JSON.stringify({status: 200, userName: user.username, pictureUrl: `http://64.226.65.83:3000/${user.pictureUrl}`});
			} else  {
				return JSON.stringify({status: 404, message: "User not found"});
			}
		} else {
			return JSON.stringify({status: 404, message: "Session not found"});
		}
	}

	async logOut(sessionToken: string) {
		const session = await getSession(sessionToken, this.prisma);
		if (session.status === 200) {
			let deletedSession = await this.prisma.sessionToken.delete({
				where: {
					token: sessionToken,
				}
			});
			return JSON.stringify({status: 200, message: `User ${session.user.username} has logged out successfully`});
		} else {
			return session.message;
		}
	}
}
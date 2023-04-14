import { startTransaction, validateUser, check, userCheck, getSession, sendCode, getUserData, parseData, codeValidation, StartTransactionResponse } from './utils/index'
import { PrismaService } from 'src/prisma/prisma.service';
import { Game, PrismaClient, User, stat} from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';


interface GetUserResponse {
	status: number;
	user: User;
	message: string;
}



@Injectable()
export class AuthService {

	prismaClient = new PrismaClient();
	constructor(public prisma: PrismaService, private readonly mailerService: MailerService) {}

	async intraGet(code: string, req: Request) :  Promise<StartTransactionResponse>{
		try {
			const [data, callback] = await getUserData(code);
			const info = await parseData(data.data, callback as string);
			const res = await startTransaction(this.prisma, info, req, this.prismaClient);
			return res;
		} catch (error) {
			if (error.code == 'ERR_BAD_REQUEST')
				return ({ status: 401, message: `invalid_grant:\n${process.env.ERROR_401}`, sessionToken: null });
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

	async signIn(req: Request) :  Promise<{status: number, message: string, sessionToken: string, twoFacAuth: boolean}> {
		try {
			return await userCheck(req, this.prisma);
		} catch (error) {
			return error;
		}
	}

	async sendValidationCode(req) : Promise<{status: number, message: string, email?: string}> {
		const result = await getSession(req.body.sessionToken, this.prisma);
		if (result.user.two_factor_auth) {
			let validCode = Math.floor((Math.random() * 9999) + 1000);
			const response = await sendCode({ user: result.user, loginIp: req.ip.split(':')[3], url: req, browser: req.useragent.browser}, validCode, this.mailerService, this.prisma);
			if (response.status == 200) {
				return ({status: 200, message: "Email sent succesfully.", email: result.user.email});
			} else {
				return { status: response.status, message: response.message, email: null }
			}
			} else {
				return ({status: 403, message: "User not enabled 2-Factor Authantication."});
			}
	}

	async validateCode(req: Request) {
		if (!req.body.email) {
			return ({status: 403, message: "Mail adresini kontrol ediniz."})
		} else if (!req.body.code) {
			return ({status: 403, message: "Doğrulama kodunu kontrol ediniz."})
		} else {
			return codeValidation(req.body.email, parseInt(req.body.code), this.prisma);
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
				return {status: 200, users: users};
			} else {
				return ({status: 501, message: "Something went wrong"});
			}
		} else {
			return ({status: 404, message: "Session not found."});
		}

	}

	async getUser(sessionToken: any): Promise<GetUserResponse> {
		const session = await this.prisma.sessionToken.findFirst({
			where: { token: sessionToken, },
		});
		if (session) {
			const user = await this.prisma.user.findUnique({
				where: { id: session.userId, },
			});
			if (user) {
				const updateUser = await this.prisma.user.update({ 
					where: { username: user.username, },
					data: { status: stat.ONLINE, },
				});
				return { status: 200, user: user, message: ""};
			} else {
				return { status: 404, user: null, message: "User not found", };
			}
		} else {
			return { status: 404, user: null, message: "Session not found", };
		}
	  }
	  

	async logOut(sessionToken: string) {
		const result = await getSession(sessionToken, this.prisma);
		if (result.status === 200) {
			let updateUser = await this.prisma.user.update({ where: {id: result.user.id}, data: {status: stat.OFFLINE }});
			let deletedSession = await this.prisma.sessionToken.delete({
				where: {
					token: sessionToken,
				}
			});
			return ({status: 200, message: `User ${result.user.username} has logged out successfully`});
		} else {
			return result.message;
		}
	}

	async updateUser(file: Express.Multer.File, sessionToken: string, body: any) : Promise<{status: number, data: {userName: string, pictureUrl: string}, message: string}> {
		const result = await this.getUser(sessionToken);
		if (result.status == 200) {
			const data = await check(body);
			const user = result.user;
			if (data) {
				const password = crypto.createHash('sha256').update(data.password + process.env.SALT_KEY + "42&bG432//t())$$$#*#z#x£SD££>c&>>+").digest('hex');
				const updatedUser = await this.prisma.user.update({
					where: {
						id: user.id,
					},
					data: {
						pass: password,
						username: data.username,
						two_factor_auth: data.twoFacAuth,
						pictureUrl: file ? file.path : user.pictureUrl,
					}
				}).catch(error => {
					if (error.code === 'P2002') {
						return ({ status: 203, message: `Username ${body.username} already exists.`, data: null});
					}
				});
				return ({ status: 200, data: { userName: data.username, pictureUrl: `http://64.226.65.83:3000/${file.path}`}, message: null});
			} else {

			}
		} else {
			return ({status: 404, message: result.message, data: null});
		}
	}
}
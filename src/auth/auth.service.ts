import { startTransaction, validateUser, check, userCheck, getSession, sendCode, getUserData, parseData } from './utils/index'
import { PrismaService } from 'src/prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthService {
	constructor(public prisma: PrismaService, private readonly mailerService: MailerService) {}

	async intraGet(code: string, req: Request) {
		try {
			const [data, callback] = await getUserData(code);
			const info = await parseData(data.data, callback as string);
			const res = await startTransaction(this.prisma, info, req);
			throw res;
		} catch (error) {
			if (error.code == 'ERR_BAD_REQUEST')
				return JSON.stringify({ status: 401, error: 'invalid_grant', message: process.env.ERROR_401 });
			return error;
		}
	}

	async singup(body: any, file: Express.Multer.File) {
		try {
			const info = await check(body);
			const user = await validateUser(body, file, this.prisma);
			throw user[1];
				
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
			const user = await getSession(req, this.prisma);
			if (user.two_factor_auth == true) {
				let validCode = Math.floor((Math.random() * 9999) + 1000);
				await sendCode({
					user: user,
					loginIp: req.ip.split(':')[3],
					url: req,
					browser: req.useragent.browser,

				}, validCode, this.mailerService, this.prisma);
			} else {
				return JSON.stringify({status: 403, message: "User not enabled 2-Factor Authantication."})
			}
		} catch (error) {
			console.log(error);
			return error;
		}
	}

	async validateCode() {
		
	}
}
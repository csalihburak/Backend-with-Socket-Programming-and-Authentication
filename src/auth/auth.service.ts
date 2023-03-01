import { getUserData, parseData, startTransaction, check, validateUser, userCheck } from './utils/auth.utlis'
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';
import { validate } from 'class-validator';


@Injectable()
export class AuthService {
	constructor(public prisma: PrismaService) {}

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

	async singup(body : any, file: Express.Multer.File) {
		try {
			const info = await check(body);
			await validateUser(body, file, this.prisma);
		} catch(error) {
			return error;
		}
	}

	async singIn(req: Request) {
		try {
			return userCheck(req, this.prisma);
		} catch (error) {
			return error;
		}
	}
}

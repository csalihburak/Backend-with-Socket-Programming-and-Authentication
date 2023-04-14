import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient, stat, User } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { AuthDto, signIndto, UserInputDto } from '.';
import { validate } from 'class-validator';
import { Request } from 'express';
import * as crypto from 'crypto';

interface GetUserResponse {
	status: number;
	user: User;
	message: string;
}

export interface StartTransactionResponse {
	status: number;
	message?: string;
	sessionToken: string;
	imageUrl?: string;
	twoFacAuth?: boolean;
}
type ValidateUserResponse = { status: number; message?: string };


export async function startTransaction(prisma: PrismaService, info: any, req: Request, Prisma: PrismaClient): Promise<StartTransactionResponse> {
	const sessionToken = crypto.randomBytes(32).toString('hex');
	const loginIp = req.ip.split(':')[3];
	try {
		const res = await Prisma.$transaction(async (tx) => {
			const user = await prisma.user.findUnique({
				where: { email: info.email, },
			});
			if (!user) {
				const newUser = await prisma.user.create({
					data: {
						username: info.username,
						pass: info.password,
						email: info.email,
						fullName: info.fullName,
						coalition: info.coalition,
						two_factor_auth: false,
						pictureUrl: info.pictureUrl,
					},
				});
				const tokenCreated = await prisma.sessionToken.create({
					data: {
						userId: newUser.id,
						loginIp,
						token: sessionToken,
					},
				});
				return { status: 203, message: 'User created without password', sessionToken: tokenCreated.token, imageUrl: info.pictureUrl };
			} else {
				const tokenCreated = await prisma.sessionToken.create({
					data: {
						userId: user.id,
						loginIp,
						token: sessionToken,
					},
				});
				if (user.pass === '') {
					return { status: 401, message: 'User exists without password', token: tokenCreated.token, imageUrl: info.pictureUrl };
				} else {
					return { status: 200, sessionToken: tokenCreated.token, twoFacAuth: user.two_factor_auth };
				}
			}
		});
	} catch (error) {
		return error;
	} finally {
		await Prisma.$disconnect();
	}
}
  
export async function check(body: any) : Promise<UserInputDto> {
	const userInput = new UserInputDto();
	userInput.password = body.password;
	if (body.twoFacAuth == "true")
		userInput.twoFacAuth = true;
	else 
		userInput.twoFacAuth = false;
	userInput.username = body.username;

	const errors = await validate(userInput);
	if (errors.length > 0) {
		return null;
	}
	return userInput;
  }

export async function validateUser( body: any, file: Express.Multer.File | undefined, prisma: PrismaService, prismaClient: PrismaClient): Promise<ValidateUserResponse> {
	try {
		const token = await prisma.sessionToken.findFirst({
			where: { token: body.sessionToken },
		});
		if (!token) {
			return { status: 403, message: "Session not found." };
		}
		const user = await prisma.user.findUnique({
			where: { id: token.userId },
			select: { pass: true },
		});
		if (user.pass) {
			return { status: 200 };
		}
		const password = crypto.createHash("sha256").update(body.password + process.env.SALT_KEY + "42&bG432//t())$$$#*#z#x£SD££>c&>>+" ).digest("hex");
		const data: any = {
			pass: password,
			two_factor_auth: body.info.twoFacAuth,
			username: body.info.username,
		};
		if (file) {
			data.pictureUrl = file.path;
		}
		try {
			const updated = await prisma.user.update({
				where: { id: token.userId },
				data,
			});
			return { status: 200, message: `${body.username} saved successfully.`};
		} catch (error) {
			if (error.code === "P2002") {
				return { status: 203, message: `Username ${body.username} already exists.`};
			}
			return {status: 501, message: error};
		}
	} catch (error) {
		return { status: 500, message: error.message };
	}
}

export async function userCheck(req: Request, prisma: PrismaService): Promise<{status: number, message: string, sessionToken: string, twoFacAuth: boolean}> {
		const userData = new signIndto();
		userData.password = req.body.password;
		userData.username = req.body.username;
		const errors = await validate(userData);
		if (errors.length > 0) {
			return {status: 203, message: errors.toString(), sessionToken: null, twoFacAuth: null};
		}

		const user = await prisma.user.findUnique({
			where: { username: userData.username },
		});
		if (!user) {
			return ({ status: 404, message: 'User not found.', sessionToken: null, twoFacAuth: null });
		}
		if (user.pass === '') {
			return ({ status: 404, message: 'Profile is not fully set.', sessionToken: null, twoFacAuth: null });
		}

		const password = crypto.createHash('sha256').update(userData.password + process.env.SALT_KEY + "42&bG432//t())$$$#*#z#x£SD££>c&>>+").digest('hex');
		if (user.pass !== password) {
			return ({ status: 203, message: 'Password is wrong.', sessionToken: null, twoFacAuth: null});
		}

		const sessionToken = crypto.randomBytes(32).toString('hex');
		await prisma.sessionToken.create({
			data: {
				userId: user.id,
				loginIp: req.ip.split(':')[3],
				token: sessionToken,
			},
		});
		await prisma.user.update({
			where: {
				username: user.username,
			},
			data: {
				status: stat.ONLINE,
			},
		});

		return ({ status: 200, sessionToken: sessionToken, twoFacAuth: user.two_factor_auth, message: "Welcome" });
}

export async function getSession(token: string, prisma: PrismaService): Promise<GetUserResponse>{
	const session = await prisma.sessionToken.findFirst({
		where: {
			token: token,
		},
	});
	if (token) {
		const user = await prisma.user.findUnique({
			where: {
				id: session.userId,
			},
		});
		if (user) {
			delete user.pass;
			return  { status: 200, user: user, message: null };
		} else {
			return { status: 501, message: "Something went wrong.", user: null };
		}
	} else {
		return { status: 404, message: "Session not found.", user: null }
	}
}
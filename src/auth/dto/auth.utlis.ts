import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { validate } from 'class-validator';
import { UserInputDto, AuthDto, signIndto } from './auth.dto';
import * as crypto from 'crypto';
import { Request } from 'express';

import axios from 'axios';

export async function getCoalition(login: string, token: string, callback) {
	const headers = { Authorization: 'Bearer ' + token };
	await axios .get('https://api.intra.42.fr//v2/users/' + login + '/coalitions', {
			headers: headers,
		})
		.then(function (response) {
			callback(response.data[0].name);
		});
}

export async function parseData(data: object, coalition: string) {
	var dto: AuthDto = {
		username: data['login'],
		email: data['email'],
		fullName: data['usual_full_name'],
		phoneNumber: data['phone'],
		coalition: coalition,
		password: '',
		pictureUrl: data['image'].link,
	};
	return dto;
}

export async function startTransaction( prisma: PrismaService, info: any, req: Request ) {
	let sessionToken = crypto.randomBytes(32).toString('hex');
	let loginIp = req.ip.split(':')[3];
	const Prisma = new PrismaClient();
	const res = await Prisma.$transaction(async (tx) => {
		const user = await prisma.user.findUnique({
			where: {
				username: info.username,
			},
		});
		if (!user) {
			const user = await prisma.user.create({
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
					userId: user.id,
					loginIp,
					token: sessionToken,
				},
			});
			throw JSON.stringify({ status: 203, message: 'User created without password', token: tokenCreated.token });
		} else {
			const tokenCreated = await prisma.sessionToken.create({
				data: {
					userId: user.id,
					loginIp,
					token: sessionToken,
				},
			});
			if (user.pass === '') {
				throw JSON.stringify({ status: 401, message: 'user exist without password', token: tokenCreated.token });
			} else {
				throw JSON.stringify({ status: 200, token: tokenCreated.token });
			}
		}
	});
}

export async function getUserData(code: string): Promise<any> {
	const response = await axios.post('https://api.intra.42.fr/oauth/token', {
		grant_type: 'authorization_code',
		client_id: process.env.CLIENT_ID,
		client_secret: process.env.CLIENT_SECRET,
		code: code,
		redirect_uri: 'http://142.93.164.123:3000/auth/intra42',
	});
	const data = await axios.get('https://api.intra.42.fr/v2/me', {
		headers: { Authorization: `Bearer ${response.data.access_token}` },
	});
	const callback = await new Promise((resolve) => {
		getCoalition(data.data['login'], response.data.access_token, (callback) => {
			resolve(callback);
		});
	});
	return [data, callback];
}

export async function check(body: any) {
	const userInput = new UserInputDto();
	userInput.password = body.password;
	userInput.sessionToken = body.sessionToken;
	userInput.twoFacAuth = body.twoFacAuth;
	const errors = await validate(userInput);
	if (errors.length > 0) {
		throw new BadRequestException(errors);
	}
	return userInput;
}

export async function validateUser(body : any, file: Express.Multer.File, prisma : PrismaService) {
	const Prisma = new PrismaClient();
	try {
		const res = await Prisma.$transaction(async () => {
			const token = await prisma.sessionToken.findFirst({
				where: {
					token: body.sessionToken,
				},
			});
			if (token) {
				const user = await prisma.user.findUnique({
					where: { id: token.userId },
					select: { pass: true },
				});
				if (!user.pass) {
					let password = crypto.createHash('sha256').update(body.password + process.env.SALT_KEY+ "42&bG432//t())$$$#*#z#x£SD££>c&>>+").digest('hex')
					let data: any = {
						pass: password,
						two_factor_auth: body.twoFacAuth,
					}
					if (file)
						data.pictureUrl = file.path;
					const updated = await prisma.user.update({
						where: { id: token.userId },
						data,
					});
				} else {
					throw JSON.stringify({status: 403, message: "User already saved to database."});
				}
			} else {
				throw JSON.stringify({status: 403, message: "Sesiion not found."});
			}
		})
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function userCheck(req: Request, prisma: PrismaService) {
	try {
		const user = new signIndto()
		user.password = req.body.password;
		user.username = req.body.username;
		const errors = await validate(user);
		if (errors.length > 0) {
			throw new BadRequestException(errors);
		} else {
			const resultInfo = await prisma.user.findUnique({
				where: {
					username: user.username,
				},
			})
			if (resultInfo) {
				let password = crypto.createHash('sha256').update(user.password + process.env.SALT_KEY+ "42&bG432//t())$$$#*#z#x£SD££>c&>>+").digest('hex');
				let sessionToken = crypto.randomBytes(32).toString('hex');
				if (resultInfo.pass === password) {
					const tokenCreated = await prisma.sessionToken.create({
						data: {
							userId: resultInfo.id,
							loginIp: req.ip.split(':')[3],
							token: sessionToken,
						},
					});
					return JSON.stringify({status: 200, token: tokenCreated.token});
				} else {
					throw JSON.stringify({status: 203, message: "Passsword is wrong."});
				}
			} else {
				throw JSON.stringify({status: 404, message: "User not found."});
			}
		}
	} catch (error) {
		return error;
	}
}
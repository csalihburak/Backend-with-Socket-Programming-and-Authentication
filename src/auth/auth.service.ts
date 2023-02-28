import { Prisma, User } from '@prisma/client';
import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import axios from 'axios';
import crypto from 'crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { json } from 'node:stream/consumers';

async function getCoalition(login: string, token: string, callback) {
	const headers = {
		Authorization: 'Bearer ' + token,
	};
	await axios
		.get('https://api.intra.42.fr//v2/users/' + login + '/coalitions', {
			headers: headers,
		})
		.then(function (response) {
			callback(response.data[0].name);
		});
}

async function parseData(data: object, coalition: string) {
	var dto: AuthDto = {
		username: data['login'],
		email: data['email'],
		fullName: data['usual_full_name'],
		phoneNumber: data['phone'],
		coalition: coalition,
		password: '',
	};
	return dto;
}

@Injectable()
export class AuthService {
	constructor(public prisma: PrismaService) {}

	async intraGet(barcode: string) {
		try {
			const response = await axios.post('https://api.intra.42.fr/oauth/token', {
				grant_type: 'authorization_code',
				client_id: process.env.CLIENT_ID,
				client_secret: process.env.CLIENT_SECRET,
				code: barcode,
				redirect_uri: 'http://142.93.164.123:3000/auth/intra42',
			});
			const data = await axios.get('https://api.intra.42.fr/v2/me', {
				headers: { Authorization: `Bearer ${response.data.access_token}` },
			});
			const callback = await new Promise((resolve, reject) => {
				getCoalition(data.data['login'], response.data.access_token, (callback) => {
						resolve(callback);
					},
				);
			});
			const info = await parseData(data.data, callback as string);
			const user = await this.prisma.user.findUnique({
				where: {
					username: info.username,
				},
			});
			if (!user) {
				const user = await this.prisma.user.create({
					data: {
						username: info.username,
						pass: info.password,
						email: info.email,
						fullName: info.fullName,
						coalition: info.coalition,
						two_factor_auth: false,
					},
				});
				throw (JSON.stringify({status: 203, message: "User created without password"}));
			} else {
				if (user.pass === '') {
					throw (JSON.stringify({status: 401, message: 'user exist without password'}));
				} else {
					throw (JSON.stringify({status: 200}));
				}
			}
		} catch (error) {
			console.log(error);
			if (error.code == "ERR_BAD_REQUEST")
				return (JSON.stringify({status: 401, error: 'invalid_grant', message: 'The provided authorization grant is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.'}));
			return error;
		}
	}
}

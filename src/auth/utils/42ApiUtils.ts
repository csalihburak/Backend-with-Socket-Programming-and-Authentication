import { AuthDto } from '.';
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

export async function getUserData(code: string): Promise<any> {
	const response = await axios.post('https://api.intra.42.fr/oauth/token', {
		grant_type: 'authorization_code',
		client_id: 'u-s4t2ud-ba8ad7103f47850daddd1c6c900631652e124bf06f9801d527b0619874f11cce',
		client_secret: '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',
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
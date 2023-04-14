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

export async function getUserData(code: string): Promise<any> { //burada ki değişkenler envden gelmeli
	const response = await axios.post('https://api.intra.42.fr/oauth/token', {
		grant_type: 'authorization_code',
		client_id: 'u-s4t2ud-4df7e4ccc88a76163269bfb3503d28aeaa7df22d23bfe31334b908e0275ee337',
		client_secret:'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',
		code: code,
		redirect_uri: 'http://64.226.65.83:3000/auth/intra42',
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
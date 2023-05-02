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
		client_id: process.env.CLIENT_ID,
		client_secret: process.nev.CLIENT_SECRET,
		code: code,
		redirect_uri: `http://${process.env.IP_ADDRESS}:3000/auth/intra42`,
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
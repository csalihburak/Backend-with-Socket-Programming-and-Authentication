import { Controller, Get, Post, Query, UseInterceptors, UploadedFile, Req, Res} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { getSession } from './utils';
import { diskStorage } from 'multer';
import * as crypto from 'crypto-js';
import { extname } from 'path';
import * as Jimp from 'jimp';

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Get('intra42')
	async firstInsert(@Query() query, @Req() req: Request, @Res() res: Response) {
		if (!query.code)
			return JSON.stringify({ status: 404, message: 'Auth token is not given' });
		const response = await this.authService.intraGet(query.code, req);
		const parse= JSON.parse(response);
		if (parse.status == 200) {
			res.redirect(`http://165.227.172.180:3000/welcome?sessionToken=${parse.token}&twoFacAuth=${parse.twoFacAuth}`);
		} else {
			res.redirect(`http://165.227.172.180:3000/setProfile?sessionToken=${parse.token}`);
		}
		res.end();
		return;
	}

	@Post('signup')
	@UseInterceptors(
		FileInterceptor('avatar', {
			storage: diskStorage({
				destination: './public/images',
				filename: (req, file, callback) => {
					const uniqsuffix = Date.now() + '-' + Math.round(Math.random() + 1e9);
					const ext = extname(file.originalname);
					const filename = `${file.originalname}-${uniqsuffix}${ext}`;
					callback(null, filename);
				},
			}),
		}),
	)
	async signup(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
		Jimp.read(file.path, (err, lenna) => {
			if (err) throw err;
			lenna
			  .resize(256, 256) 
			  .quality(100)
			  .write(file.path);
		  });
		return this.authService.singup(req.body, file);
	}

	@Post('signin')
	async signin(@Req() req: Request, @Res() res: Response) {
		const result = await this.authService.signIn(req);
		const parse = JSON.parse(result);
		if (parse.status == 200) {
			res.send(JSON.stringify({status: parse.status, sessionToken: parse.token, twoFacAuth: parse.twoFacAuth}));
		} else {
			console.log(parse);
			res.send(JSON.stringify({status: parse.status, mesage: parse.message}));
		}
	}

	@Get('user')
	async user(@Req() req: Request) {
		const sessionToken = req.query.sessionToken;
		return this.authService.getUser(sessionToken);
	}

	@Get('leaderBoard')
	async leaderBord(@Req() req: Request) {
		const sessionToken = req.query.sessionToken;
		return this.authService.leaderBord(sessionToken);
	}

	@Post('sendValidationCode')
	async sendValidCode (@Req() req) {
		return this.authService.sendValidationCode(req);
	}

	@Post('loginValidate')
	async validate(@Req() req) {
		return this.authService.validateCode(req);
	}


	@Post('uploads')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: './public/chatImages/',
				filename: (req, file, callback) => {
					const uniqsuffix = Date.now();
					const ext = extname(file.originalname);
					const filename = `${file.originalname}-${uniqsuffix}${ext}`;
					callback(null, filename);
				},
			}),
		}),
	)
	async uploadFile(@UploadedFile() file: Express.Multer.File , @Res() res: Response){
		Jimp.read(file.path, (err, lenna) => {
			if (err) throw err;
			lenna
			  .resize(256, 256) 
			  .quality(100)
			  .write(file.path);
		  });
		const url = file.path;
		res.send({
			body: {
				url: url,
			}
		});
		res.end();
	}

	@Post('logout')
	async logout(@Req() req: Request) {
		const sessionToken = req.body.sessionToken;
		return await this.authService.logOut(sessionToken);
	}
}
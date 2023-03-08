import { Body, Controller, Get, Post, Query, UseInterceptors,UploadedFile, Req, BadRequestException, Res, Render} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Get('intra42')
	async firstInsert(@Query() query, @Req() req: Request, @Res() res: Response) {
		if (!query.code)
			return JSON.stringify({ status: 404, message: 'Auth token is not given' });
			const response = await this.authService.intraGet(query.code, req);
			const parse = JSON.parse(response);
			if (parse.status == 200) {
				res.cookie('sessionToken', "1", {httpOnly: true, path: "http://142.93.104.99:3000/welcome"});
				res.setHeader('Set-Cookie', [`sessionToken=${parse.token}; Path=http://142.93.104.99:3000/welcome; HttpOnly`]);
				res.redirect(`http://142.93.104.99:3000/welcome?sessionToken=${parse.token}&twoFacAuth=${parse.twoFacAuth}`);
			} else {
				console.log(parse);
				res.cookie('sessionToken', "1", {httpOnly: true, path: "/"});
				res.setHeader('Set-Cookie', [`sessionToken=${parse.token}; Path=/; HttpOnly`]);
				res.redirect(`http://142.93.104.99:3000/setProfile?sessionToken=${parse.token}&pictureUrl=${parse.imageUrl}`);
			}
			res.end();
			return;
	}

	@Post('signup')
	@UseInterceptors(
		FileInterceptor('avatar', {
			storage: diskStorage({
				destination: './avatars/',
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
		return this.authService.singup(req.body, file);
	}

	@Post('signin')
	async signin(@Req() req: Request, @Res() res: Response) {
		const result = await this.authService.signIn(req);
		const parse = JSON.parse(result);
		if (parse.status == 200 && parse.twoFacAuth == true) {
			res.send(JSON.stringify({status: parse.status, sessionToken: parse.token, twoFacAuth: parse.twoFacAuth}));
		} else {
			console.log(parse);
			res.send(JSON.stringify({status: parse.status, mesage: parse.message}));
		}
	}

	@Get('game')
	@Render('game')
	getPage2() {
	return { title: 'Page 2' };
	}

	@Post('sendValidationCode')
	async sendValidCode (@Req() req) {
		return this.authService.sendValidationCode(req);
	}

	@Post('loginValidate')
	async validate(@Req() req) {
		return this.authService.validateCode(req);
	}
}
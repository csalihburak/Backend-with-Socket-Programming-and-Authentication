import { Body, Controller, Get, Post, Query, UseInterceptors,UploadedFile, Req, BadRequestException, Res} from '@nestjs/common';
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
			res.cookie('sessionToken', "1", {httpOnly: true, path: "/"});
			res.setHeader('Set-Cookie', [`sessionToken=${parse.token}; Path=/; HttpOnly`]);
			res.redirect(`http://142.93.104.99:3000/setProfile?sessionToken=${parse.token}`);
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
		console.log(req.file);
		return this.authService.singup(req.body, file);
	}

	@Post('signin')
	async signin(@Req() req: Request) {
		return this.authService.signIn(req);
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
import { Body, Controller, Get, Post, Query, UseInterceptors,UploadedFile, Req, BadRequestException, Res, Render} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';

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
				res.redirect(`http://142.93.104.99:3000/welcome?sessionToken=${parse.token}&twoFacAuth=${parse.twoFacAuth}`);
			} else {
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
		if (parse.status == 200) {
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

	

	@Post('uploads')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: './public/images/',
				filename: (req, file, callback) => {
					const uniqsuffix = Date.now();
					const ext = extname(file.originalname);
					const filename = `${file.originalname}-${uniqsuffix}${ext}`;
					callback(null, filename);
				},
			}),
		}),
	)
	async uploadFile(@UploadedFile() file: Express.Multer.File,@Req() req, @Res() res: Response){
		const url = file.path;
		console.log(url);
		res.send({
			body: {
				url: url,
			}
		});
		res.end();

	}
}
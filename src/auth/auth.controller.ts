import { Controller, Get, Post, Query, UseInterceptors, UploadedFile, Req, Res} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as Jimp from 'jimp';
import { FlagFilled } from '@ant-design/icons';

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Get('intra42')
	async firstInsert(@Query() query, @Req() req: Request, @Res() res: Response) {
		if (!query.code) {
			return { status: 404, message: 'Auth token is not given' };
		}
		const response = await this.authService.intraGet(query.code, req);
		if (response.status == 200) {
			res.redirect(`http://64.226.65.83:3001/welcome?sessionToken=${response.sessionToken}&twoFacAuth=${response.twoFacAuth}`);
		} else{
			res.redirect(`http://64.226.65.83:3001/setProfile?sessionToken=${response.sessionToken}`); //hata
		}
		res.end();
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
		try {
			Jimp.read(file.path, (err, lenna) => {
				if (err) throw err;
				lenna
				.resize(256, 256) 
				.quality(100)
				.write(file.path);
			});
			const sessionToken = req.body;
			const result =  await this.authService.singup(req.body, file);
			return result;
		} catch (error) {
			return {status: 403, message: "Please use small size images"};
		}
	}

	@Post('signin')
	async signin(@Req() req: Request, @Res() res: Response) {
		const result = await this.authService.signIn(req);
		if (result.status == 200) {
			res.send({status: result.status, sessionToken: result.sessionToken, twoFacAuth: result.twoFacAuth});
		} else {
			res.send({status: result.status, mesage: result.message});
		}
	}

	@Get('user')
	async user(@Req() req: Request) {
		const sessionToken = req.query.sessionToken;
		const result = await this.authService.getUser(sessionToken);
		if(result.status == 200) {
			return {status: 200, userName: result.user.username, pictureUrl: `http://64.226.65.83:3000/${result.user.pictureUrl}`};
		}
	}

	@Get('leaderBoard')
	async leaderBord(@Req() req: Request) {
		const sessionToken = req.query.sessionToken;
		return this.authService.leaderBord(sessionToken);
	}

	@Get('liveScore')
	async liveScor(@Req() req: Request) {
		const sessionToken : any = req.query.sessionToken;
		return await this.authService.liveScore(sessionToken);
	}

	@Post('sendValidationCode')
	async sendValidCode (@Req() req: Request) {
		return this.authService.sendValidationCode(req);
	}

	@Post('loginValidate')
	async validate(@Req() req: Request) {
		return this.authService.validateCode(req);
	}

	@Post('forgetPassword')
	async forgetPassword(@Req() req: Request) {
		this.authService.forgetPassword(req);
	}

	@Post('resetPassword')
	async resetPassword(@Req() req: Request) {
		const sessionToken : any = req.query.sessionToken;
		console.log(sessionToken);
		if (sessionToken) {
			const result = await this.authService.resetPassword(req, sessionToken);
			console.log(result);
			return result;
		} else {
			return { status: 404, message: "Sessiontoken is not given." }
		}
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
	async uploadFile(@UploadedFile() file: Express.Multer.File , @Res() res: Response) {
		try {
			Jimp.read(file.path, (err, lenna) => {
				if (err) throw err;
				lenna.resize(256, 256) .quality(100).write(file.path);
			});
			const url = file.path;
			return ({ body: { url: url }});
		} catch(error) {
			return error;
		}
	}

	@Post('logout')
	async logout(@Req() req: Request) {
		const sessionToken : any = req.query.sessionToken;
		return await this.authService.logOut(sessionToken);
	}

	@Post('updateUser')
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
	async updateUser(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
		const sessionToken: any = req.query.sessionToken;
		if (sessionToken) {
			const result = await this.authService.updateUser(file, sessionToken, req.body);
			return result;
		} else {
			return ({status: 203, message: "Sessiontoken not found"});
		}
	}

}

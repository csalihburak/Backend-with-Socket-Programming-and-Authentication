import { Controller, Get, Post, Query, UseInterceptors, UploadedFile, Req, Res} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as Jimp from 'jimp';

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Get('intra42')
	async firstInsert(@Query() query, @Req() req: Request, @Res() res: Response) {
		if (!query.code) {
			res.send({ status: 404, message: 'Auth token is not given' })
			return;
		}
		const response = await this.authService.intraGet(query.code, req);
		console.log(response);
		if (response.status == 200) {
			res.redirect(`http://localhost/welcome?sessionToken=${response.sessionToken}&twoFacAuth=${response.twoFacAuth}`);
		} else{
			res.redirect(`http://localhost/setProfile?sessionToken=${response.sessionToken}`); //hata
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
/* 		try {
			Jimp.read(file.path, (err, lenna) => {
				if (err) throw err;
				lenna
				.resize(256, 256) 
				.quality(100)
				.write(file.path);
			});
		} catch (error) {
			return {status: 403, message: "Please use small size images"};
		} */
		if (req.body.sessionToken != null) {
			const result =  await this.authService.singup(req.body, file);
			return result;
		} else {
			return { status: 203, message: "Session Token is not given" }		
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
		if (sessionToken != null) {
			const result = await this.authService.getUser(sessionToken);
			if (result.status == 200) {
				return {status: 200, userName: result.user.username, pictureUrl: `http://localhost:3000/${result.user.pictureUrl}`};
			}
		} else {
			return { status: 203, message: "Session Token is not given" }		
		}
	}

	@Get('leaderBoard')
	async leaderBord(@Req() req: Request) {
		const sessionToken = req.query.sessionToken;
		if (sessionToken != null) {
			return this.authService.leaderBord(sessionToken);
		} else {
			return { status: 203, message: "Session Token is not given" }		
		}
	}

	@Get('liveScore')
	async liveScor(@Req() req: Request) {
		const sessionToken : any = req.query.sessionToken;
		if (sessionToken != null) {
			return await this.authService.liveScore(sessionToken);
		} else {
			return { status: 203, message: "Session Token is not given" }		
		}
	}

	@Post('sendValidationCode')
	async sendValidCode (@Req() req: Request) {
		if (req.query.sessionToken != null) {
			return this.authService.sendValidationCode(req);
		} else {
			return { status: 203, message: "Session Token is not given" };
		}
	}

	@Post('loginValidate')
	async validate(@Req() req: Request) {
		return this.authService.validateCode(req);
	}

	@Post('forgetPassword')
	async forgetPassword(@Req() req: Request, @Res() res: Response) {
		const result = await this.authService.forgetPassword(req);
		res.status(result.status);
		res.setHeader('status', result.status)
		res.send(result);
		res.end();
	}

	@Post('resetPassword')
	async resetPassword(@Req() req: Request) {
		const sessionToken : any = req.query.sessionToken;
		if (sessionToken) {
			const result = await this.authService.resetPassword(req, sessionToken);
			return result;
		} else {
			return { status: 203, message: "Sessiontoken is not given." }
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
			res.send({ body: { url: url }});
		} catch(error) {
			res.send(error);
		}
	}

	@Post('logout')
	async logout(@Req() req: Request) {
		const sessionToken : any = req.query.sessionToken;
		if (sessionToken) {
			return await this.authService.logOut(sessionToken);
		} else {
			return { status: 203, message: "Sessiontoken is not given." }
		}
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
			return { status: 203, message: "Sessiontoken is not given." }
		}
	}

}

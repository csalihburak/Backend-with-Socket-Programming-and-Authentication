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
			res.redirect(`http://142.93.104.99:3000/SetProfile?sessionToken=${parse.token}`);
			res.end();
	}

	@Post('signup')
	async signup(@Body() body: any) {
		console.log("test:");
		var file: Express.Multer.File;
		return this.authService.singup(body, file);
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
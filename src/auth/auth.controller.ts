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

			//res.cookie('sessionToken', "1", {httpOnly: true, path: "/"});
			res.setHeader('Set-Cookie', [`sessionToken=${parse.token}; Path=/; HttpOnly`]);
			res.redirect(`http://142.93.164.123:3000/auth/login-page`);
	}

 	@Get('login-page')
	async getLoginPage(@Res() res: Response, @Req() req: Request) {
		console.log(req.headers);
	  const html = `
		<html>
		  <head>
			<title>Login Page</title>
		  </head>
		  <body>
			<form method="post" action="/auth/login">
			  <label for="username">Username:</label>
			  <input type="text" id="username" name="username"><br><br>
			  <label for="password">Password:</label>
			  <input type="password" id="password" name="password"><br><br>
			  <input type="submit" value="Submit">
			</form>
		  </body>
		</html>
	  `;
	  res.send(html);
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
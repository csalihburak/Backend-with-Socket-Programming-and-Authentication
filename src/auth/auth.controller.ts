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
	async firstInsert(@Query() query, @Req() req: Request) {
		if (!query.code)
			return JSON.stringify({
				status: 404,
				message: 'Auth token is not given',
			});
		return await this.authService.intraGet(query.code, req);
	}

	@Post('singup')
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
	async signup(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
		if (file && (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpeg')) {
			await fs.promises.unlink(file.path);
			throw new BadRequestException('Only PNG and JPEG files are allowed');
		  }
		return this.authService.singup(body, file);
	}

	@Post('signin')
	async signin(@Req() req: Request) {
		return this.authService.singIn(req);
	}
}
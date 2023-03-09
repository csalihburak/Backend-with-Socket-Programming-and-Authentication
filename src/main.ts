import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as useragent from 'express-useragent';
import * as cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as requestIp from 'request-ip';
import * as geoip from 'geoip-lite';
import * as express from 'express';
import { join } from 'path';
import * as ejs from 'ejs';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
	app.use((req, res, next) => {
		const ipAddress = req.ip;
		const geo = geoip.lookup(ipAddress);
		req.geo = geo;
		next();
	});
	app.use(express.json({ limit: '50mb' }));
	app.use(express.urlencoded({ limit: '50mb', extended: true }));
	app.enableCors();
	app.use(cookieParser());
	app.use(requestIp.mw());
	app.use(useragent.express());
	app.use('/', express.static('../views/'));
	app.useStaticAssets(join(__dirname, '..', 'views'));
	app.engine('html', ejs.renderFile);
	app.engine('html', ejs.renderFile);
	app.setViewEngine('html');
	await app.listen(3000);
}
bootstrap();

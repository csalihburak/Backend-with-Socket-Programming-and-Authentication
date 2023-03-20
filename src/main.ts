import { NestExpressApplication } from '@nestjs/platform-express';
import { CorsMiddleware } from '@nest-middlewares/cors';
import { ValidationPipe } from '@nestjs/common';
import * as useragent from 'express-useragent';
import * as cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as requestIp from 'request-ip';
import * as geoip from 'geoip-lite';
import * as express from 'express';

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
/* 	app.use('/', express.static('../messageFiles'));
	app.use('/', express.static('../views/'));
	app.useStaticAssets(join(__dirname, '..', 'views'));
	app.useStaticAssets(join(__dirname, '..', 'messageFiles'));
	app.engine('html', ejs.renderFile);
	app.engine('html', ejs.renderFile);
	app.setViewEngine('html'); */
	await app.listen(3000);
}
bootstrap();

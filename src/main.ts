import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as useragent from 'express-useragent';
import * as cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as requestIp from 'request-ip';
import * as geoip from 'geoip-lite';
import { join } from 'path';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use((req, res, next) => {
    const ipAddress = req.ip;
    const geo = geoip.lookup(ipAddress);
    req.geo = geo;
    next();
  });
	app.enableCors();
	app.use(cookieParser());
  app.use(requestIp.mw());
	app.use(useragent.express());
  app.useStaticAssets(join(__dirname, '..', 'static'));
	await app.listen(3000);
}
bootstrap();

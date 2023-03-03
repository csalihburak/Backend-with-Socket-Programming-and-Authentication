import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Module } from '@nestjs/common';

@Module({
	imports: [PrismaModule,
	MulterModule.register({dest: './uploads'}), MailerModule.forRoot({
		transport: {
		  host: 'smtp.gmail.com',
		  port: 465,
		  secure: true,
		  auth: {
			user: process.env.MAIL,
			pass: process.env.PASS,
		  },
		},
	  }),],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}

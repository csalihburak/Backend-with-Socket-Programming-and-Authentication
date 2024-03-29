import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { validate } from 'class-validator';
import { UserInputDto } from '.';
import axios from 'axios';
import * as ejs from 'ejs';
import * as fs from 'fs';


export async function sendCode(data: any, validCode: number, mailerService: MailerService, prisma: PrismaService) : Promise<{ status: number, message: string }> {
	const response = await axios.get(`https://ipinfo.io/${data.loginIp}?token=81f70b0a6cf316`);
	const { country, region, city, postal} = response.data;
	const user  = data.user;
	const htmlTemplate = fs.readFileSync('src/auth/templates/emailTemplate.html', 'utf8');
	const htmlContent = ejs.render(htmlTemplate, { validCode: validCode, user: user, country: country, region: region, city: city, postal: postal, data: data });
	mailerService.sendMail({
		to: user.email,
		subject: 'Two-Factor Login Verification',
		html: htmlContent,
	})
	.then(async () => {
		const expiredDate = new Date();
		expiredDate.setMinutes(expiredDate.getMinutes() + 2);
		const result = await prisma.validate.create({
			data: {
				userId: user.id,
				validcode: validCode,
				email: user.email,
				expired_date: expiredDate,
			},
		});
		const deleted = await prisma.validate.deleteMany({
			where: {
				userId: user.id,
				NOT: [ { validcode: validCode, }, ],
			},
		});
	})
	.catch((error) => {
		return { status: 404, message: error};
	});
	return { status: 200, message: 'Email sent successfully'};
}

export async function codeValidation(email: string, validationCode: number, prisma: PrismaService) {
	const validation = await prisma.validate.findFirst({
		where: {
			email: email,
		}
	});
	if (validation) {
		if (validation.validcode == validationCode) {
			const currentDate = new Date();
			if (currentDate > validation.expired_date) {
				return ({ status: 401, message: "Verification code has expired." });
			}
			return ({ status: 200, message: "Code is correct." });
		} else {
			return ({ status: 401, message:"Wrong code." });
		}
	} else {
		return ({status: 403, message: "Verification not found."});
	}
}
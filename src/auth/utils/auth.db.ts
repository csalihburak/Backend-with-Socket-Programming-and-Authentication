import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { AuthDto, signIndto, UserInputDto } from '.';
import { MailerService } from '@nestjs-modules/mailer';
import { validate } from 'class-validator';
import * as crypto from 'crypto';
import { Request } from 'express';
import { throwError } from 'rxjs';


export async function startTransaction(prisma: PrismaService, info: any, req: Request, Prisma: PrismaClient) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const loginIp = req.ip.split(':')[3];
  
    try {
      const res = await Prisma.$transaction(async (tx) => {
        const user = await prisma.user.findUnique({
          where: {
            username: info.username,
          },
        });
  
        if (!user) {
          const user = await prisma.user.create({
            data: {
              username: info.username,
              pass: info.password,
              email: info.email,
              fullName: info.fullName,
              coalition: info.coalition,
              two_factor_auth: false,
              pictureUrl: info.pictureUrl,
            },
          });
  
          const tokenCreated = await prisma.sessionToken.create({
            data: {
              userId: user.id,
              loginIp,
              token: sessionToken,
            },
          });
  
          throw JSON.stringify({
            status: 203,
            message: 'User created without password',
            token: tokenCreated.token
          });
        } else {
          const tokenCreated = await prisma.sessionToken.create({
            data: {
              userId: user.id,
              loginIp,
              token: sessionToken,
            },
          });
  
          if (user.pass === '') {
            throw JSON.stringify({
              status: 401,
              message: 'user exist without password',
              token: tokenCreated.token
            });
          } else {
            throw JSON.stringify({
              status: 200,
              token: tokenCreated.token
            });
          }
        }
      });
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
		await Prisma.$disconnect();
	  }
  }
  
export async function check(body: any) {
    const userInput = new UserInputDto();
    userInput.password = body.password;
    userInput.sessionToken = body.sessionToken;
    userInput.twoFacAuth = body.twoFacAuth;
	userInput.username = body.username;
  
/*     const errors = await validate(userInput);
  
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    } */
  
    return userInput;
  }

  export async function validateUser(body: any, file: Express.Multer.File, prisma: PrismaService, prismaClient: PrismaClient) {
	try {
	  const res = await prismaClient.$transaction(async () => {
		const token = await prisma.sessionToken.findFirst({
		  where: {
			token: body.sessionToken,
		  },
		});
		if (!token) {
		  return [403, JSON.stringify({ status: 403, message: "Session not found." })];
		}
  
		const user = await prisma.user.findUnique({
		  where: { id: token.userId },
		  select: { pass: true },
		});
		if (user.pass) {
		  return [403, JSON.stringify({ status: 200 })];
		}
  
		const password = crypto.createHash('sha256')
		  .update(body.password + process.env.SALT_KEY + "42&bG432//t())$$$#*#z#x£SD££>c&>>+")
		  .digest('hex');
  
		const data: any = {
		  pass: password,
		  two_factor_auth: body.twoFacAuth,
		  username: body.username,
		};
		if (file) {
		  data.pictureUrl = file.path;
		}
  
		try {
		  const updated = await prisma.user.update({
			where: { id: token.userId },
			data,
		  });
		  return [200, JSON.stringify({ status: 200, message: `${body.username} saved successfully.` })];
		} catch (error) {
		  if (error.code === 'P2002') {
			return [403, JSON.stringify({ status: 403, message: `Username ${body.username} already exists.` })];
		  }
		  throw error;
		}
	  });
	  return res;
	} catch (error) {
	  return error;
	} finally {
	  await prismaClient.$disconnect();
	}
}

export async function userCheck(req: Request, prisma: PrismaService) {
	try {
		const user = new signIndto()
		user.password = req.body.password;
		user.username = req.body.username;
		const errors = await validate(user);
		if (errors.length > 0) {
			throw new BadRequestException(errors);
		} else {
			const resultInfo = await prisma.user.findUnique({
				where: {
					username: user.username,
				},
			})
			if (resultInfo) {
				if (resultInfo.pass === '') {
					throw JSON.stringify({status: 401, message: "User profile is not fully set"});
				} else {					
					let password = crypto.createHash('sha256').update(user.password + process.env.SALT_KEY+ "42&bG432//t())$$$#*#z#x£SD££>c&>>+").digest('hex');
					let sessionToken = crypto.randomBytes(32).toString('hex');
					if (resultInfo.pass === password) {
						const tokenCreated = await prisma.sessionToken.create({
							data: {
								userId: resultInfo.id,
								loginIp: req.ip.split(':')[3],
								token: sessionToken,
							},
						});
						return JSON.stringify({status: 200, token: tokenCreated.token});
					} else {
						throw JSON.stringify({status: 203, message: "Passsword is wrong."});
					}
				}
			} else {
				throw JSON.stringify({status: 404, message: "User not found."});
			}
				}
	} catch (error) {
		return error;
	}
}

export async function getSession(req: Request, prisma: PrismaService) : Promise<User> {
	const token = await prisma.sessionToken.findFirst({
		where: {
			token: req.body.token,
		},
	});
	if (token) {
		const user = await prisma.user.findUnique({
			where: {
				id: token.userId,
			},
		});
		if (user) {
			delete user.pass;
			return user;
		} else {
			throw JSON.stringify({ status: 501, message: "Something went wrong."});
		}
	} else {
		throw JSON.stringify({ status: 404, message: "Session not found."});
	}
}
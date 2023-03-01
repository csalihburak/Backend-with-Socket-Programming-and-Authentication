import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
	imports: [PrismaModule,
	MulterModule.register({dest: './uploads'})],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}

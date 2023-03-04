import { GameModule } from './game/game.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [AuthModule, UserModule, GameModule, PrismaModule],
})
export class AppModule {}

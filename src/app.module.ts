import { GameModule } from './game/game.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { chatGateAWay } from './chat/chat.gateway';
import { Module } from '@nestjs/common';

@Module({
  imports: [AuthModule, chatGateAWay, GameModule, PrismaModule],
})
export class AppModule {}

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CorsMiddleware } from '@nest-middlewares/cors';
import { GameModule } from './game/game.module'


@Module({
  imports: [AuthModule, PrismaModule, GameModule],
})
export class AppModule {}

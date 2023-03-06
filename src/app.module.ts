import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CorsMiddleware } from '@nest-middlewares/cors';
import { gameGateaway } from './game/game.gateaway'
 
@Module({
  imports: [AuthModule, PrismaModule, gameGateaway],
})
export class AppModule {}

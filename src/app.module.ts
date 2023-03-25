import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { CorsMiddleware } from '@nest-middlewares/cors';
import { GameModule } from './game/game.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { chatGateAWay } from './chat/chat.gateway';
import { chatService } from './chat/chat.service';

@Module({
	imports: [
		AuthModule,
		PrismaModule,
		GameModule,
		ServeStaticModule.forRoot({
			rootPath: join(__dirname, '..', 'public'),
			serveRoot: '/public',
			exclude: ['/api*'],
		}),
	],
	providers: [chatGateAWay, chatService]
})
export class AppModule {
	configure(consumer: any) {
		consumer.apply(CorsMiddleware).forRoutes('*');
	}
}

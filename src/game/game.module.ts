import { Module } from '@nestjs/common';
import { GameGateaway } from './gameUtils';
import { GameUtilsGateway } from './game.gateway';
import { GameService } from './game.service'

@Module({
  imports: [],
  controllers: [],
  providers: [GameGateaway, GameUtilsGateway ,GameService],
})
export class GameModule {}
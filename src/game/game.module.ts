import { Module } from '@nestjs/common';
import { GameGateaway } from './game.gateaway';
import { GameUtilsGateway } from './gameUtils.gateway';
import { GameService } from './game.service'

@Module({
  imports: [],
  controllers: [],
  providers: [GameGateaway, GameUtilsGateway ,GameService],
})
export class GameModule {}
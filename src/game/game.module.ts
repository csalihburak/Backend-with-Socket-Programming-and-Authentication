import { Module } from '@nestjs/common';
import { GameGateaway } from './game.gateaway';
import { GameService } from './game.service'

@Module({
  imports: [],
  controllers: [],
  providers: [GameGateaway, GameService],
})
export class GameModule {}
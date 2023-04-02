import { channelCommands } from './channel.commands';
import { chatGateAWay } from './chat.gateway';
import { chatService } from './chat.service';
import { chatUtils } from './chat.utils';
import { Module } from '@nestjs/common';
import { webUtils } from './web.utils';

@Module({
  imports: [],
  controllers: [],
  providers: [chatGateAWay, channelCommands, chatService, chatUtils, webUtils],
})
export class chatModule {}
import { Module } from '@nestjs/common';
import { PusherService } from './pusher.service';
import { PusherAuthController } from './pusher-auth.controller';

@Module({
  controllers: [PusherAuthController],
  providers: [PusherService],
  exports: [PusherService],
})
export class WebsocketModule {}

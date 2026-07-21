import { Body, Controller, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PusherService } from './pusher.service';

/**
 * Pusher's client SDK calls this endpoint automatically whenever it tries to
 * subscribe to a "private-" channel, sending the socket_id + channel_name it
 * wants. We only approve it if the channel belongs to the same tenant as the
 * logged-in user's JWT (via the existing JwtStrategy/AuthGuard) — this is the
 * equivalent of the old gateway's handleConnection() tenant check.
 */
@Controller('pusher')
export class PusherAuthController {
  constructor(private pusherService: PusherService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('auth')
  auth(@Req() req: any, @Body() body: { socket_id: string; channel_name: string }) {
    const tenantId = req.user?.tenantId;
    const { socket_id, channel_name } = body;

    const allowedPrefixes = [
      `private-kitchen-${tenantId}`,
      `private-pos-${tenantId}`,
      `private-inventory-${tenantId}`,
    ];

    if (!allowedPrefixes.includes(channel_name)) {
      throw new ForbiddenException('Not allowed to subscribe to this channel');
    }

    return this.pusherService.authorizeChannel(socket_id, channel_name);
  }
}

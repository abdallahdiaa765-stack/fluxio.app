import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsCronService } from './subscriptions-cron.service';

/**
 * On a normal always-on server, `@Cron(EVERY_DAY_AT_8AM)` in
 * SubscriptionsCronService is enough - Nest keeps the process alive and
 * fires it automatically. Vercel Functions have no persistent process, so
 * nothing would ever call that method in production. Vercel Cron Jobs (see
 * vercel.json) hit this HTTP endpoint once a day instead and it does the
 * exact same work.
 *
 * Protected by a shared secret (not JWT) because Vercel Cron calls this
 * without a logged-in user. Vercel auto-provisions a CRON_SECRET env var
 * and sends it as `Authorization: Bearer <CRON_SECRET>` on every cron
 * invocation automatically - our own CRON_SECRET env var must be set to
 * that same value so the check below matches.
 *
 * Vercel Cron always sends GET, never POST - see vercel.json.
 */
@Controller('internal/cron')
export class SubscriptionsCronController {
  constructor(
    private cronService: SubscriptionsCronService,
    private configService: ConfigService,
  ) {}

  @Get('subscriptions-daily-check')
  async run(@Headers('authorization') authHeader: string) {
    const expected = `Bearer ${this.configService.get('CRON_SECRET')}`;
    if (!authHeader || authHeader !== expected) {
      throw new UnauthorizedException();
    }

    await this.cronService.runDailyCheck();
    return { ok: true, ranAt: new Date().toISOString() };
  }
}

import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsCronService } from './subscriptions-cron.service';
import { SubscriptionsCronController } from './subscriptions-cron.controller';

@Module({
  controllers: [SubscriptionsController, SubscriptionsCronController],
  providers: [SubscriptionsService, SubscriptionsCronService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

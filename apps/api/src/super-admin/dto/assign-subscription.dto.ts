import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { SubscriptionPlan } from '@fluxio/database';

export class AssignSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @IsIn(['monthly', 'yearly'])
  billingCycle!: 'monthly' | 'yearly';

  // Optional override for the period length in days. Defaults to 30 for
  // monthly and 365 for yearly if omitted - lets the super admin grant a
  // custom period (e.g. a free trial extension or a mid-cycle top-up)
  // without needing a separate endpoint.
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}

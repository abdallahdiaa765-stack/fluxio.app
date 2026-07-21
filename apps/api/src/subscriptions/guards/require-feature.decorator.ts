import { SetMetadata } from '@nestjs/common';
import { FeatureFlag } from '../feature-flags';

export const REQUIRED_FEATURE = 'requiredFeature';

export const RequireFeature = (flag: FeatureFlag) => SetMetadata(REQUIRED_FEATURE, flag);

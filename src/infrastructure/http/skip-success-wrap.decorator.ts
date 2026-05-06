import { SetMetadata } from '@nestjs/common';

/** Must match SuccessResponseInterceptor reflector key. */
export const SKIP_SUCCESS_WRAP_KEY = 'skipWrap';

export const SkipSuccessWrap = () => SetMetadata(SKIP_SUCCESS_WRAP_KEY, true);

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '@/types/jwt';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUser;
  },
);

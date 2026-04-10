import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserPlan } from '@prisma/client';

export interface SignableUser {
  id: string;
  email: string | null;
  plan: UserPlan;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  signForUser(user: SignableUser): string {
    return this.jwt.sign({
      sub: user.id,
      email: user.email ?? undefined,
      plan: user.plan,
    });
  }

  verifyToken(token: string): unknown {
    return this.jwt.verify(token);
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '@/types/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  signForUser(user: any) {
    return this.jwt.sign({ user });
  }

  decoded(token) {
    return this.jwt.verify(token);
  }

  /**
   * Issue a short-lived JWT for a guest user.
   * Payload is compatible with JwtStrategy (sub/email/plan), but uses a 24h expiry.
   */
  signGuest(input: { id: string; email?: string | null }): string {
    const payload: JwtPayload = {
      sub: input.id,
    };

    if (input.email) {
      payload.email = input.email;
    }

    // Guest tokens are intentionally short-lived (24h)
    return this.jwt.sign(payload, { expiresIn: '24h' });
  }
}

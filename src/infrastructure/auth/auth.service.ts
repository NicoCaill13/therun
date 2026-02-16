import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { JwtPayload } from '@/types/jwt';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Sign a JWT token for a registered user.
   */
  signForUser(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }

  /**
   * Verify and decode a JWT token.
   */
  decoded(token: string): JwtPayload {
    return this.jwt.verify(token);
  }

  /**
   * Hash a plain-text password using bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Compare a plain-text password against a bcrypt hash.
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
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

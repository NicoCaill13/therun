import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, JwtUser } from '@/types/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'DEV_ONLY_SECRET_CHANGE_ME',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    // Ce qui est retourné ici sera injecté dans req.user
    return {
      userId: payload.sub,
      email: payload.email,
      plan: payload.plan,
    };
  }
}

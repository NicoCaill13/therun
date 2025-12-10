import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) { }

  signForUser(user: any) {
    return this.jwt.sign({ user });
  }

  decoded(token) {
    return this.jwt.verify(token);
  }
}

import { JwtService } from '@nestjs/jwt';
import { UserPlan } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('signForUser signs a JWT payload compatible with JwtStrategy', () => {
    const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
    const service = new AuthService(jwt as unknown as JwtService);

    const token = service.signForUser({
      id: 'user_1',
      email: 'a@example.com',
      plan: UserPlan.PREMIUM,
    });

    expect(token).toBe('signed-token');
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'user_1',
      email: 'a@example.com',
      plan: UserPlan.PREMIUM,
    });
  });

  it('signForUser omits email when null', () => {
    const jwt = { sign: jest.fn().mockReturnValue('t') };
    const service = new AuthService(jwt as unknown as JwtService);

    service.signForUser({
      id: 'user_1',
      email: null,
      plan: UserPlan.FREE,
    });

    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'user_1',
      email: undefined,
      plan: UserPlan.FREE,
    });
  });
});

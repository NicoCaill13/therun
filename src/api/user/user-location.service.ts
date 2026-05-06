import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@/prisma/client';
import type { UpdateMyLocationDto } from './dto/update-my-location.dto';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './repositories/user.repository';

@Injectable()
export class UserLocationService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async updateMyLocation(
    userId: string,
    dto: UpdateMyLocationDto,
  ): Promise<void> {
    try {
      await this.users.updateLastKnownLocation(
        userId,
        dto.latitude,
        dto.longitude,
        dto.expoPushToken,
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      throw e;
    }
  }
}

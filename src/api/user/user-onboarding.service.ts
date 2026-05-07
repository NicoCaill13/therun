import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@/prisma/client';
import type { UpdateMyOnboardingDto } from './dto/update-my-onboarding.dto';
import type { MyOnboardingStateDto } from './dto/my-onboarding-state.dto';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './repositories/user.repository';

@Injectable()
export class UserOnboardingService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async getMyOnboarding(userId: string): Promise<MyOnboardingStateDto> {
    const row = await this.users.findOnboardingById(userId);
    if (!row) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    return row;
  }

  async patchMyOnboarding(
    userId: string,
    dto: UpdateMyOnboardingDto,
  ): Promise<MyOnboardingStateDto> {
    const hasPatch =
      dto.hasCompletedOnboarding !== undefined ||
      dto.consentDataBrokering !== undefined;
    if (!hasPatch) {
      throw new BadRequestException(
        'At least one of hasCompletedOnboarding or consentDataBrokering is required',
      );
    }
    try {
      await this.users.patchOnboarding(userId, {
        ...(dto.hasCompletedOnboarding !== undefined
          ? { hasCompletedOnboarding: dto.hasCompletedOnboarding }
          : {}),
        ...(dto.consentDataBrokering !== undefined
          ? { consentDataBrokering: dto.consentDataBrokering }
          : {}),
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      throw e;
    }
    const row = await this.users.findOnboardingById(userId);
    if (!row) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    return row;
  }
}

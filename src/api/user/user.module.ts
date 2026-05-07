import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/db/prisma.module';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { USER_REPOSITORY } from './repositories/user.repository';
import { UserLocationV1Controller } from './user-location-v1.controller';
import { UserLocationService } from './user-location.service';
import { UserOnboardingV1Controller } from './user-onboarding-v1.controller';
import { UserOnboardingService } from './user-onboarding.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserLocationV1Controller, UserOnboardingV1Controller],
  providers: [
    UserLocationService,
    UserOnboardingService,
    PrismaUserRepository,
    { provide: USER_REPOSITORY, useExisting: PrismaUserRepository },
  ],
  exports: [USER_REPOSITORY, PrismaUserRepository],
})
export class UserModule {}

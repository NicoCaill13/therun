import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/db/prisma.module';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { USER_REPOSITORY } from './repositories/user.repository';
import { UserLocationV1Controller } from './user-location-v1.controller';
import { UserLocationService } from './user-location.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserLocationV1Controller],
  providers: [
    UserLocationService,
    PrismaUserRepository,
    { provide: USER_REPOSITORY, useExisting: PrismaUserRepository },
  ],
  exports: [USER_REPOSITORY, PrismaUserRepository],
})
export class UserModule {}

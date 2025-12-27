import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserController } from './user.controller';
import { AuthModule } from '@/infrastructure/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UsersModule { }

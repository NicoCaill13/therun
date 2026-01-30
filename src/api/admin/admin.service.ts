import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UpdateUserPlanDto, UpdateUserPlanResponseDto } from './dto/update-user-plan.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * S8.4.1: Switch user plan (Free <-> Premium)
   * Admin-only operation for testing and support purposes.
   */
  async updateUserPlan(userId: string, dto: UpdateUserPlanDto): Promise<UpdateUserPlanResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        plan: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousPlan = user.plan;
    const changedAt = new Date();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: dto.plan,
        planSince: dto.planSince ? new Date(dto.planSince) : changedAt,
        planUntil: dto.planUntil ? new Date(dto.planUntil) : null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        plan: true,
        planSince: true,
        planUntil: true,
      },
    });

    // Log the plan change for audit purposes
    this.logger.log(`Plan changed for user ${userId}: ${previousPlan} -> ${dto.plan} at ${changedAt.toISOString()}`);

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      previousPlan,
      newPlan: updated.plan,
      planSince: updated.planSince,
      planUntil: updated.planUntil,
      changedAt,
    };
  }
}

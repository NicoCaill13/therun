import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { UserPlan } from '@prisma/client';

export class UpdateUserPlanDto {
  @ApiProperty({ enum: UserPlan, description: 'New plan for the user' })
  @IsEnum(UserPlan)
  plan!: UserPlan;

  @ApiProperty({ description: 'Plan start date (optional)', required: false })
  @IsOptional()
  @IsDateString()
  planSince?: string;

  @ApiProperty({ description: 'Plan end date (optional)', required: false })
  @IsOptional()
  @IsDateString()
  planUntil?: string;
}

export class UpdateUserPlanResponseDto {
  @ApiProperty({ description: 'User ID' })
  id!: string;

  @ApiProperty({ description: 'User email', nullable: true })
  email!: string | null;

  @ApiProperty({ description: 'User first name' })
  firstName!: string;

  @ApiProperty({ description: 'User last name', nullable: true })
  lastName!: string | null;

  @ApiProperty({ enum: UserPlan, description: 'Previous plan' })
  previousPlan!: UserPlan;

  @ApiProperty({ enum: UserPlan, description: 'New plan' })
  newPlan!: UserPlan;

  @ApiProperty({ description: 'Plan start date', nullable: true })
  planSince!: Date | null;

  @ApiProperty({ description: 'Plan end date', nullable: true })
  planUntil!: Date | null;

  @ApiProperty({ description: 'Timestamp of the change' })
  changedAt!: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import { UserPlan } from '@prisma/client';

export class MeProfileResponseDto {
  @ApiProperty({ description: 'User ID' })
  id!: string;

  @ApiProperty({ description: 'User email', nullable: true })
  email!: string | null;

  @ApiProperty({ description: 'User first name' })
  firstName!: string;

  @ApiProperty({ description: 'User last name', nullable: true })
  lastName!: string | null;

  @ApiProperty({ description: 'Display name' })
  displayName!: string;

  @ApiProperty({ description: 'Is guest user' })
  isGuest!: boolean;

  @ApiProperty({ enum: UserPlan, description: 'User plan (FREE or PREMIUM)' })
  plan!: UserPlan;

  @ApiProperty({ description: 'Plan start date', nullable: true })
  planSince!: Date | null;

  @ApiProperty({ description: 'Plan end date', nullable: true })
  planUntil!: Date | null;

  @ApiProperty({ description: 'Date when terms were accepted', nullable: true })
  acceptedTermsAt!: Date | null;

  @ApiProperty({ description: 'Account creation date' })
  createdAt!: Date;
}

export class PlanBenefitsDto {
  @ApiProperty({ description: 'Maximum active events per week (-1 = unlimited)' })
  maxActiveEventsPerWeek!: number;

  @ApiProperty({ description: 'Access to global route library' })
  globalRouteLibraryAccess!: boolean;

  @ApiProperty({ description: 'Description of the plan benefits' })
  description!: string;
}

export class MeProfileWithBenefitsResponseDto extends MeProfileResponseDto {
  @ApiProperty({ type: PlanBenefitsDto, description: 'Benefits of the current plan' })
  planBenefits!: PlanBenefitsDto;
}

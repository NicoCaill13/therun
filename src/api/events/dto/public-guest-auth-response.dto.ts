import { ApiProperty } from '@nestjs/swagger';
import { EventParticipantStatus, RoleInEvent, UserPlan } from '@prisma/client';

export class PublicGuestAuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty({ required: false, nullable: true })
  lastName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  email?: string | null;

  @ApiProperty()
  isGuest!: boolean;

  @ApiProperty({ enum: UserPlan })
  plan!: UserPlan;
}

export class PublicGuestAuthParticipationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty({ enum: RoleInEvent })
  role!: RoleInEvent;

  @ApiProperty({ enum: EventParticipantStatus })
  status!: EventParticipantStatus;
}

export class PublicGuestAuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: PublicGuestAuthUserDto })
  user!: PublicGuestAuthUserDto;

  @ApiProperty({ type: PublicGuestAuthParticipationDto })
  participation!: PublicGuestAuthParticipationDto;
}

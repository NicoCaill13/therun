import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RespondInvitationResponseDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsIn(['PARTICIPANT', 'ENCADRANT', 'ORGANISER'])
  role: 'PARTICIPANT' | 'ENCADRANT' | 'ORGANISER';

  @IsIn(['GOING', 'DECLINED'])
  status: 'GOING' | 'DECLINED';
}

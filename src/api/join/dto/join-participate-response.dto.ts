import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class JoinParticipateResponseDto {
  @IsString()
  @IsNotEmpty()
  participantId: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsIn(['PARTICIPANT', 'ENCADRANT', 'ORGANISER'])
  role: 'PARTICIPANT' | 'ENCADRANT' | 'ORGANISER';

  @IsIn(['GOING'])
  status: 'GOING';
}

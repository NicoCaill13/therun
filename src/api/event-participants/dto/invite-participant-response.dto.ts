import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class InviteParticipantResponseDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsIn(['PARTICIPANT', 'ENCADRANT'])
  role: 'PARTICIPANT' | 'ENCADRANT';

  @IsIn(['INVITED'])
  status: 'INVITED';
}

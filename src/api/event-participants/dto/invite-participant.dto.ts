import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class InviteParticipantDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  // MVP: on limite explicitement aux 2 rôles autorisés
  @IsIn(['PARTICIPANT', 'ENCADRANT'])
  role: 'PARTICIPANT' | 'ENCADRANT';
}

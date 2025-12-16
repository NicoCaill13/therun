import { IsIn } from 'class-validator';

export class RespondInvitationDto {
  @IsIn(['GOING', 'DECLINED'])
  status: 'GOING' | 'DECLINED';
}

import { IsEnum } from 'class-validator';
import { RoleInEvent } from '@/common/enums';

export class UpdateParticipantRoleDto {
  @IsEnum(RoleInEvent)
  roleInEvent: RoleInEvent;
}

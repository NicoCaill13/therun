import { IsEnum } from 'class-validator';
import { RoleInEvent } from '@prisma/client';

export class UpdateParticipantRoleDto {
  @IsEnum(RoleInEvent)
  roleInEvent: RoleInEvent;
}

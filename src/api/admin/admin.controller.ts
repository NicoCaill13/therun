import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { UpdateUserPlanDto, UpdateUserPlanResponseDto } from './dto/update-user-plan.dto';

/**
 * Admin controller for administrative operations.
 *
 * NOTE: In production, this controller should be protected by an admin role guard.
 * For MVP, we rely on JWT auth only. Admin role checking should be added in V1.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('users/:userId/plan')
  @ApiOperation({
    summary: "Changer le plan d'un utilisateur (Free <-> Premium)",
    description:
      'Endpoint admin pour basculer un utilisateur entre les plans Free et Premium. ' +
      'Utilisé pour les tests, le support et les promotions manuelles. ' +
      'NOTE: Dans une version production, cet endpoint devrait être protégé par un rôle admin.',
  })
  @ApiOkResponse({
    type: UpdateUserPlanResponseDto,
    description: 'Plan mis à jour avec succès',
  })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiForbiddenResponse({ description: 'Accès refusé (rôle admin requis en production)' })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  updateUserPlan(@Param('userId') userId: string, @Body() dto: UpdateUserPlanDto): Promise<UpdateUserPlanResponseDto> {
    return this.adminService.updateUserPlan(userId, dto);
  }
}

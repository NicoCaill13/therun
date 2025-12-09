// src/events/events.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
// @UseGuards(JwtAuthGuard) // à réactiver quand ton guard est prêt
export class EventsController {
  constructor(private readonly eventsService: EventsService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Créer un événement (MVP-1)' })
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateEventDto) {
    const organiserId = 'TODO_USER_ID'; // à remplacer par user.id
    return this.eventsService.createForOrganiser(user.userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Lister mes événements (à venir / passés)' })
  @ApiQuery({
    name: 'scope',
    enum: ['future', 'past'],
    required: false,
    description: 'future = à venir (défaut), past = événements passés',
  })
  async findMyEvents(
    @Query('scope') scope: 'future' | 'past' = 'future',
    // @CurrentUser() user: AuthUser,
  ) {
    const organiserId = 'TODO_USER_ID'; // user.id
    return this.eventsService.findMyEvents(organiserId, scope);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer le détail d’un événement' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un événement (tant qu’il est PLANNED)',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    // @CurrentUser() user: AuthUser,
  ) {
    const organiserId = 'TODO_USER_ID'; // user.id
    return this.eventsService.update(organiserId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Changer le statut (COMPLETED / CANCELLED)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
    // @CurrentUser() user: AuthUser,
  ) {
    const organiserId = 'TODO_USER_ID'; // user.id
    return this.eventsService.updateStatus(organiserId, id, dto);
  }
}

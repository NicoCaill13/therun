// src/api/event-invites/event-invites.module.ts
import { Module } from '@nestjs/common';
import { EventInvitesController } from './event-invites.controller';
import { EventInvitesService } from './event-invites.service';

@Module({
  controllers: [EventInvitesController],
  providers: [EventInvitesService],
  exports: [EventInvitesService],
})
export class EventInvitesModule {}

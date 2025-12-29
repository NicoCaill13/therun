import { CurrentUserParticipationResponseDto, EventParticipantDto } from '@/api/event-participants/dto/event-participant.dto';
import { SimpleUserResponseDto } from '@/api/users/dto/simple-user.dto';
import { EventStatus } from '@prisma/client';
import { Expose, Transform, Type } from 'class-transformer';

export class EventBlockResponseDto {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  description!: string | null;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value), {
    toPlainOnly: true,
  })
  startDateTime: Date | string;

  @Expose()
  locationName!: string | null;

  @Expose()
  locationAddress!: string | null;

  @Expose()
  locationLat!: number | null;

  @Expose()
  locationLng!: number | null;

  @Expose()
  status!: EventStatus;

  @Expose()
  eventCode!: string;

  @Expose()
  completedAt!: Date | null;

  @Expose()
  goingCountAtCompletion: number | null;
}

export class EventDetailsResponseDto {
  @Expose()
  @Type(() => EventBlockResponseDto)
  event!: EventBlockResponseDto;

  @Expose()
  @Type(() => SimpleUserResponseDto)
  organiser!: SimpleUserResponseDto;

  @Expose()
  @Type(() => EventParticipantDto)
  participants!: EventParticipantDto[];

  @Expose()
  @Type(() => CurrentUserParticipationResponseDto)
  currentUserParticipation!: CurrentUserParticipationResponseDto | null;
}

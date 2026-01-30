import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { InviteSearchQueryDto } from './dto/invite-search-query.dto';
import { InviteSearchResponseDto } from './dto/invite-search-response.dto';
import { normalizePagination, computePaginationMeta } from '@/common/utils/pagination.util';
import { findEventAsOrganiserOrThrow } from '@/common/helpers/event-access.helper';

@Injectable()
export class EventInvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUsersToInvite(eventId: string, callerId: string, dto: InviteSearchQueryDto): Promise<InviteSearchResponseDto> {
    await findEventAsOrganiserOrThrow(this.prisma, eventId, callerId, undefined, 'Only organiser can invite participants');

    const pagination = normalizePagination(dto);
    const q = dto.query.trim();

    const where = {
      isGuest: false,
      id: { not: callerId },
      OR: [
        { firstName: { contains: q, mode: 'insensitive' as const } },
        { lastName: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const [totalCount, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
    ]);

    const meta = computePaginationMeta(totalCount, pagination);

    return {
      items: users,
      ...meta,
    };
  }
}

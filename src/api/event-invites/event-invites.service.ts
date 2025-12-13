import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { InviteSearchQueryDto } from './dto/invite-search-query.dto';
import { InviteSearchResponseDto } from './dto/invite-search-response.dto';

@Injectable()
export class EventInvitesService {
  constructor(private readonly prisma: PrismaService) { }

  async searchUsersToInvite(eventId: string, callerId: string, dto: InviteSearchQueryDto): Promise<InviteSearchResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organiserId: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organiserId !== callerId) {
      throw new ForbiddenException('Only organiser can invite participants');
    }

    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const q = dto.query.trim();

    const where = {
      isGuest: false,
      id: { not: callerId }, // exclure l’organisateur lui-même
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    return {
      items: users,
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  }
}

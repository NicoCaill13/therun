import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { UserPlan, User } from '@prisma/client';
import { AuthService } from '@/infrastructure/auth/auth.service';
import { normalizeEmail } from '@/common/utils/email.util';
import { buildDisplayName, DisplayNameInput } from '@/common/utils/display-name.util';

export interface UserPublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Récupère un user par id ou lève une NotFoundException.
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Expose un profil public (id, displayName, avatarUrl) à partir d’un user Prisma.
   * Ça encapsule la logique d’affichage du nom.
   */
  toPublicProfile(user: DisplayNameInput & { avatarUrl?: string | null }): UserPublicProfile {
    return {
      id: user.id!,
      displayName: buildDisplayName(user),
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async register(dto: RegisterDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException('Terms must be accepted');
    }

    const email = normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isGuest: true, plan: true, email: true },
    });

    if (existing && !existing.isGuest) {
      throw new ConflictException('Email already used');
    }

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            isGuest: false,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName?.trim() ?? null,
            acceptedTermsAt: new Date(),
            plan: UserPlan.FREE,
            planSince: existing.plan === UserPlan.FREE ? null : undefined,
          },
          select: { id: true, email: true, plan: true, isGuest: true, firstName: true, lastName: true },
        })
      : await this.prisma.user.create({
          data: {
            // eslint-disable-next-line prettier/prettier
          email,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName?.trim() ?? null,
            isGuest: false,
            acceptedTermsAt: new Date(),
            plan: UserPlan.FREE,
          },
          select: { id: true, email: true, plan: true, isGuest: true, firstName: true, lastName: true },
        });

    const accessToken = this.auth.signForUser(user);

    return {
      accessToken,
      user,
      mergedFromGuest: !!existing, // utile pour debug/observabilité
    };
  }

  async mergeGuestsByEmail(emailRaw: string, realUserId: string): Promise<MergeGuestsSummary> {
    const email = normalizeEmail(emailRaw);

    if (!email) throw new BadRequestException('email is required');
    if (!realUserId) throw new BadRequestException('realUserId is required');

    return this.prisma.$transaction(async (tx) => {
      // ✅ Pré-conditions
      const realUser = await tx.user.findUnique({
        where: { id: realUserId },
        select: { id: true, isGuest: true },
      });
      if (!realUser) throw new NotFoundException('realUser not found');
      if (realUser.isGuest) throw new BadRequestException('realUser must be a non-guest');

      // ✅ Guests à fusionner
      const guests = await tx.user.findMany({
        where: { email, isGuest: true },
        select: { id: true },
      });

      if (guests.length === 0) {
        // Idempotence : rien à faire
        return {
          mergedGuestsCount: 0,
          reassignedParticipantsCount: 0,
          dedupedParticipantsCount: 0,
        };
      }

      const guestIds = guests.map((g) => g.id);

      // Toutes les participations des guests
      const guestParticipants = await tx.eventParticipant.findMany({
        where: { userId: { in: guestIds } },
        select: { id: true, eventId: true, userId: true },
      });

      if (guestParticipants.length === 0) {
        // Toujours idempotent : on peut quand même considérer guests "fusionnés"
        // mais on ne supprime pas les guests ici (non demandé). On retourne juste un résumé.
        return {
          mergedGuestsCount: guests.length,
          reassignedParticipantsCount: 0,
          dedupedParticipantsCount: 0,
        };
      }

      // Events sur lesquels les guests ont une participation
      const eventIds = Array.from(new Set(guestParticipants.map((p) => p.eventId)));

      // Participations déjà existantes pour realUserId sur ces events
      const realExisting = await tx.eventParticipant.findMany({
        where: { userId: realUserId, eventId: { in: eventIds } },
        select: { id: true, eventId: true },
      });

      const realExistingByEvent = new Set(realExisting.map((p) => p.eventId));

      let reassignedParticipantsCount = 0;
      let dedupedParticipantsCount = 0;

      // On traite chaque participation guest individuellement pour garder un comportement simple + idempotent
      for (const p of guestParticipants) {
        if (!realExistingByEvent.has(p.eventId)) {
          // 🔁 Réassignation (si personne n’existe pour (eventId, realUserId))
          await tx.eventParticipant.update({
            where: { id: p.id },
            data: { userId: realUserId },
          });
          reassignedParticipantsCount += 1;

          // IMPORTANT : maintenant realUser a une participation sur cet event
          realExistingByEvent.add(p.eventId);
        } else {
          // 🧹 Déduplication : on ne veut pas de doublon (eventId, realUserId)
          // Ici, on supprime la participation du guest (puisqu’elle ferait doublon)
          await tx.eventParticipant.delete({ where: { id: p.id } });
          dedupedParticipantsCount += 1;
        }
      }

      // Idempotence : si on relance, guestParticipants sera vide (ou déjà réassigné),
      // donc reassigned/deduped = 0
      return {
        mergedGuestsCount: guests.length,
        reassignedParticipantsCount,
        dedupedParticipantsCount,
      };
    });
  }
}

export interface MergeGuestsSummary {
  mergedGuestsCount: number;
  reassignedParticipantsCount: number;
  dedupedParticipantsCount: number;
}

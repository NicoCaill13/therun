import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserPlan } from '@/common/enums';
import { AuthService } from '@/infrastructure/auth/auth.service';
import { normalizeEmail } from '@/common/utils/email.util';
import { buildDisplayName, DisplayNameInput } from '@/common/utils/display-name.util';
import type { JwtPayload } from '@/types/jwt';

export interface UserPublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Reusable select clause for user fields exposed in auth responses.
 */
const USER_SELECT = {
  id: true,
  email: true,
  plan: true,
  isGuest: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Retrieve a user by id or throw NotFoundException.
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
   * Build a public profile DTO from a user entity.
   */
  toPublicProfile(user: DisplayNameInput & { avatarUrl?: string | null }): UserPublicProfile {
    return {
      id: user.id!,
      displayName: buildDisplayName(user),
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  /**
   * Build a JWT payload from a user entity.
   */
  private buildJwtPayload(user: { id: string; email: string | null; plan: UserPlan }): JwtPayload {
    const payload: JwtPayload = { sub: user.id };
    if (user.email) payload.email = user.email;
    payload.plan = user.plan;
    return payload;
  }

  async register(dto: RegisterDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException('Terms must be accepted');
    }

    const email = normalizeEmail(dto.email);
    const passwordHash = await this.auth.hashPassword(dto.password);

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
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName?.trim() ?? null,
            acceptedTermsAt: new Date(),
            plan: UserPlan.FREE,
            planSince: existing.plan === UserPlan.FREE ? null : undefined,
          },
          select: USER_SELECT,
        })
      : await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName?.trim() ?? null,
            isGuest: false,
            acceptedTermsAt: new Date(),
            plan: UserPlan.FREE,
          },
          select: USER_SELECT,
        });

    const accessToken = this.auth.signForUser(this.buildJwtPayload(user));

    return {
      accessToken,
      user,
      mergedFromGuest: !!existing,
    };
  }

  /**
   * Authenticate a user by email and password.
   * Returns an access token and user data, or throws UnauthorizedException.
   */
  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { ...USER_SELECT, passwordHash: true },
    });

    if (!user || user.isGuest || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.auth.verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.auth.signForUser(this.buildJwtPayload(user));

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        isGuest: user.isGuest,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async mergeGuestsByEmail(emailRaw: string, realUserId: string): Promise<MergeGuestsSummary> {
    const email = normalizeEmail(emailRaw);

    if (!email) throw new BadRequestException('email is required');
    if (!realUserId) throw new BadRequestException('realUserId is required');

    return this.prisma.$transaction(async (tx) => {
      const realUser = await tx.user.findUnique({
        where: { id: realUserId },
        select: { id: true, isGuest: true },
      });
      if (!realUser) throw new NotFoundException('realUser not found');
      if (realUser.isGuest) throw new BadRequestException('realUser must be a non-guest');

      const guests = await tx.user.findMany({
        where: { email, isGuest: true },
        select: { id: true },
      });

      if (guests.length === 0) {
        return {
          mergedGuestsCount: 0,
          reassignedParticipantsCount: 0,
          dedupedParticipantsCount: 0,
        };
      }

      const guestIds = guests.map((g) => g.id);

      const guestParticipants = await tx.eventParticipant.findMany({
        where: { userId: { in: guestIds } },
        select: { id: true, eventId: true, userId: true },
      });

      if (guestParticipants.length === 0) {
        return {
          mergedGuestsCount: guests.length,
          reassignedParticipantsCount: 0,
          dedupedParticipantsCount: 0,
        };
      }

      const eventIds = Array.from(new Set(guestParticipants.map((p) => p.eventId)));

      const realExisting = await tx.eventParticipant.findMany({
        where: { userId: realUserId, eventId: { in: eventIds } },
        select: { id: true, eventId: true },
      });

      const realExistingByEvent = new Set(realExisting.map((p) => p.eventId));

      let reassignedParticipantsCount = 0;
      let dedupedParticipantsCount = 0;

      for (const p of guestParticipants) {
        if (!realExistingByEvent.has(p.eventId)) {
          await tx.eventParticipant.update({
            where: { id: p.id },
            data: { userId: realUserId },
          });
          reassignedParticipantsCount += 1;
          realExistingByEvent.add(p.eventId);
        } else {
          await tx.eventParticipant.delete({ where: { id: p.id } });
          dedupedParticipantsCount += 1;
        }
      }

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

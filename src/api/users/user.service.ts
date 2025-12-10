import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';

export type UserPublicProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }

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
  toPublicProfile(user: any): UserPublicProfile {
    return {
      id: user.id,
      displayName: this.buildDisplayName(user),
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  /**
   * Règle de construction du displayName :
   * - displayName
   * - sinon firstName + lastName
   * - sinon email
   * - sinon id
   */
  private buildDisplayName(user: any): string {
    if (!user) return 'Inconnu';

    if (user.displayName) {
      return user.displayName as string;
    }

    const parts: string[] = [];

    if (user.firstName) {
      parts.push(user.firstName as string);
    }
    if (user.lastName) {
      parts.push(user.lastName as string);
    }

    if (parts.length > 0) {
      return parts.join(' ');
    }

    if (user.email) {
      return user.email as string;
    }

    return user.id as string;
  }
}

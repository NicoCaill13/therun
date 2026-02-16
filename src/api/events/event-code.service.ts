import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { randomInt } from 'crypto';

const EVENT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

@Injectable()
export class EventCodeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a random readable event code.
   */
  generateEventCode(codeLength?: number): string {
    const len = codeLength ?? randomInt(5, 9);
    let code = '';
    for (let i = 0; i < len; i++) {
      code += EVENT_CODE_ALPHABET[randomInt(0, EVENT_CODE_ALPHABET.length)];
    }
    return code;
  }

  /**
   * Generate a unique event code (retry up to 10 times).
   */
  async generateUniqueEventCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generateEventCode();
      const existing = await this.prisma.event.findUnique({
        where: { eventCode: code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    throw new BadRequestException('Unable to generate unique eventCode');
  }
}

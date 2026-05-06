import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@/prisma/client';

const CONNECT_MAX_ATTEMPTS = 30;
const CONNECT_RETRY_DELAY_MS = 2000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    for (let attempt = 1; attempt <= CONNECT_MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        const isLast = attempt === CONNECT_MAX_ATTEMPTS;
        this.logger.warn(
          `Database unreachable (attempt ${attempt}/${CONNECT_MAX_ATTEMPTS}). Retrying in ${CONNECT_RETRY_DELAY_MS}ms.`,
        );
        if (isLast) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

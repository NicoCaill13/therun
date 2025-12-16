import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan } from '@prisma/client';

export interface E2eContext {
  app: INestApplication;
  prisma: PrismaService;
  jwtService: JwtService;
}

export async function createE2eApp(): Promise<E2eContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);

  return { app, prisma, jwtService };
}

export async function seedUser(
  prisma: PrismaService,
  plan: UserPlan,
  data: Partial<Parameters<typeof prisma.user.create>[0]['data']> = {},
) {
  return prisma.user.create({
    data: {
      email: null,
      firstName: 'John',
      lastName: 'Doe',
      isGuest: false,
      plan: plan,
      planSince: null,
      planUntil: null,
      acceptedTermsAt: new Date(),
      ...data,
    },
  });
}

export function makeJwtToken(jwtService: JwtService, userId: string, userEmail: string, plan: UserPlan): string {
  return jwtService.sign({
    sub: userId,
    email: userEmail,
    plan,
  });
}

export const clearEventsAndRoutes = async (prisma: PrismaService) => {
  await prisma.eventParticipant.deleteMany();
  await prisma.eventGroup.deleteMany();
  await prisma.eventRoute.deleteMany();
  await prisma.route.deleteMany();
  await prisma.event.deleteMany();
};

export const clearAll = async (prisma: PrismaService) => {
  await clearEventsAndRoutes(prisma);
  await prisma.user.deleteMany();
};

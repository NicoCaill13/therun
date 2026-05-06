import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, HttpStatus, VersioningType } from '@nestjs/common';
import { PrismaClientExceptionFilter } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SuccessResponseInterceptor } from './infrastructure/http/success';
import { AllExceptionsFilter } from './infrastructure/http/exception';
import { RequestMethod } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '.well-known/(.*)', method: RequestMethod.ALL },
      { path: 'welcome/(.*)', method: RequestMethod.ALL },
    ],
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });

  const reflector = app.get(Reflector);
  const classSerializer = new ClassSerializerInterceptor(reflector);
  const successWrapper = new SuccessResponseInterceptor(reflector);
  app.useGlobalInterceptors(classSerializer, successWrapper);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les champs non attendus
      forbidNonWhitelisted: true,
      transform: true, // transforme les payloads vers les DTO
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('The Run API')
    .setDescription('Endpoints Runalytics (Strava, Coach, Analytics)')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(httpAdapter, {
      P2000: HttpStatus.BAD_REQUEST,
      P2002: HttpStatus.CONFLICT,
      P2025: HttpStatus.NOT_FOUND,
      P2003: HttpStatus.BAD_REQUEST,
      /** Column/table missing: DB not migrated (e.g. `passwordHash` on User). */
      P2022: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorMessage:
          'Database schema is out of sync with the Prisma schema. Apply pending migrations (e.g. `npx prisma migrate deploy`).',
      },
    }),
    new AllExceptionsFilter(),
  );
  const configService = app.get(ConfigService);
  const portRaw =
    configService.get<string>('APP_PORT') ??
    configService.get<string>('PORT') ??
    '3000';
  const port = Number.parseInt(portRaw, 10);

  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      /* Expo web dev (expo start --web) */
      'http://localhost:8081',
      'http://127.0.0.1:8081',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.listen(Number.isFinite(port) ? port : 3000);
}
bootstrap();
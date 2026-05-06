import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { SuccessResponseInterceptor } from '../src/infrastructure/http/success';

/**
 * Mirrors HTTP bootstrap in src/main.ts so e2e hits the same routes and envelopes.
 */
export function applyMainLikeHttpLayer(app: INestApplication): void {
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
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new SuccessResponseInterceptor(reflector),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
}

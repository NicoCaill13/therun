import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/db/prisma.service';
import { applyMainLikeHttpLayer } from './apply-main-like-http-layer';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    applyMainLikeHttpLayer(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/ping (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api/ping').expect(200);

    expect(res.body.data).toEqual({ status: 'ok' });
  });
});

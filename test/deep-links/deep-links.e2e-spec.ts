import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createE2eApp } from '../e2e-utils';

describe('S6.2.1 – Deep links & QR trampoline (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /.well-known/apple-app-site-association -> 200 json', async () => {
    const res = await request(app.getHttpServer()).get('/.well-known/apple-app-site-association').expect(200);

    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body).toHaveProperty('applinks');
    expect(res.body.applinks).toHaveProperty('details');
  });

  it('GET /.well-known/assetlinks.json -> 200 json array', async () => {
    const res = await request(app.getHttpServer()).get('/.well-known/assetlinks.json').expect(200);

    expect(res.headers['content-type']).toContain('application/json');
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('relation');
    expect(res.body[0]).toHaveProperty('target');
  });

  it('GET /join/:eventCode -> 200 html contenant deep link + fallback', async () => {
    const code = 'ABC123';
    const res = await request(app.getHttpServer()).get(`/welcome/${code}`).expect(200);

    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain(`therun://event/${code}`);
    expect(res.text).toContain(`/public/join/${code}?source=qr`);
  });
  it('GET /join/:eventCode -> 200 (root) ou /api/join/:eventCode si globalPrefix', async () => {
    const code = 'ABC123';

    const root = await request(app.getHttpServer()).get(`/welcome/${code}`);
    if (root.status !== 200) {
      const api = await request(app.getHttpServer()).get(`/api/welcome/${code}`).expect(200);
      expect(api.text).toContain(`therun://event/${code}`);
      return;
    }

    expect(root.text).toContain(`therun://event/${code}`);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  LocationService,
  RADAR_MVP_DEFAULT_RADIUS_KM,
} from './location.service';

describe('LocationService', () => {
  it('calculateDynamicRadius uses RADAR_RADIUS_KM when set', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: ConfigService, useValue: { get: () => '12.5' } },
      ],
    }).compile();
    const svc = module.get(LocationService);
    expect(svc.calculateDynamicRadius(0, 0)).toBe(12.5);
  });

  it('calculateDynamicRadius falls back to MVP default', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    const svc = module.get(LocationService);
    expect(svc.calculateDynamicRadius(48.85, 2.35)).toBe(
      RADAR_MVP_DEFAULT_RADIUS_KM,
    );
  });

  it('distanceKm delegates to haversine', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    const svc = module.get(LocationService);
    const d = svc.distanceKm(
      { latitude: 45.5, longitude: -73.6 },
      { latitude: 45.51, longitude: -73.59 },
    );
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(3);
  });
});

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { haversineDistanceKm } from './haversine';

/** MVP default from GitHub issue #113 (density API deferred). */
export const RADAR_MVP_DEFAULT_RADIUS_KM = 5;

@Injectable()
export class LocationService {
  constructor(private readonly config: ConfigService) {}

  distanceKm(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
  ): number {
    return haversineDistanceKm(
      a.latitude,
      a.longitude,
      b.latitude,
      b.longitude,
    );
  }

  /**
   * Dynamic notification radius (km). MVP: fixed default; optional env override.
   * Future: urban density (e.g. 2 km dense / 15 km rural).
   */
  calculateDynamicRadius(latitude: number, longitude: number): number {
    const raw = this.config.get<string>('RADAR_RADIUS_KM');
    if (raw !== undefined && raw !== '') {
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    void latitude;
    void longitude;
    return RADAR_MVP_DEFAULT_RADIUS_KM;
  }
}

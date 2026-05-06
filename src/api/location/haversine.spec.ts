import { haversineDistanceKm } from './haversine';

describe('haversineDistanceKm', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineDistanceKm(45.5, -73.6, 45.5, -73.6)).toBeCloseTo(0, 5);
  });

  it('returns plausible distance for short urban hop (Montreal-ish)', () => {
    const km = haversineDistanceKm(45.5017, -73.5673, 45.51, -73.56);
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(2);
  });
});

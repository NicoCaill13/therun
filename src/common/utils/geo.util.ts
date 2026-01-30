/**
 * Geographic utility functions for distance calculations and bounding boxes.
 */

/** Earth radius in meters */
const EARTH_RADIUS_METERS = 6_371_000;

/** Meters per degree of latitude (approximate, constant) */
const METERS_PER_DEGREE_LAT = 111_320;

/**
 * Converts degrees to radians.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the Haversine distance between two geographic points.
 * Returns distance in meters.
 *
 * @param lat1 - Latitude of first point in degrees
 * @param lng1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lng2 - Longitude of second point in degrees
 * @returns Distance in meters
 */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lng2 - lng1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Converts a radius in meters to latitude delta (degrees).
 * This is approximately constant regardless of latitude.
 */
export function metersToLatDelta(radiusMeters: number): number {
  return radiusMeters / METERS_PER_DEGREE_LAT;
}

/**
 * Converts a radius in meters to longitude delta (degrees).
 * This varies with latitude due to Earth's spherical shape.
 *
 * @param radiusMeters - Radius in meters
 * @param lat - Latitude in degrees (used to adjust for spherical distortion)
 */
export function metersToLngDelta(radiusMeters: number, lat: number): number {
  const rad = toRadians(lat);
  return radiusMeters / (METERS_PER_DEGREE_LAT * Math.cos(rad));
}

/**
 * Bounding box coordinates for geographic queries.
 */
export interface BoundingBox {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/**
 * Computes a bounding box around a center point.
 * Useful for filtering database queries before applying exact distance calculations.
 *
 * @param lat - Center latitude in degrees
 * @param lng - Center longitude in degrees
 * @param radiusMeters - Radius in meters
 */
export function computeBoundingBox(lat: number, lng: number, radiusMeters: number): BoundingBox {
  const latDelta = metersToLatDelta(radiusMeters);
  const lngDelta = metersToLngDelta(radiusMeters, lat);

  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lngMin: lng - lngDelta,
    lngMax: lng + lngDelta,
  };
}

/**
 * Location data structure for signature computation.
 */
export interface LocationData {
  locationName: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
}

/**
 * Creates a signature string for a location.
 * Used to detect changes in location data.
 */
export function locationSignature(location: LocationData): string {
  return [location.locationName ?? '', location.locationAddress ?? '', location.locationLat ?? '', location.locationLng ?? ''].join(
    '|',
  );
}

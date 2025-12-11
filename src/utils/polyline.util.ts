type LatLng = { lat: number; lng: number };

export function decodePolyline(encoded: string): LatLng[] {
  let index = 0;
  const len = encoded.length;
  const path: LatLng[] = [];
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let result = 0;
    let shift = 0;
    let b: number;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return path;
}

export function computeDistanceMeters(points: LatLng[]): number {
  if (points.length < 2) return 0;

  const R = 6371000; // rayon Terre en m
  let distance = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);

    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    distance += R * c;
  }

  return Math.round(distance);
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function computeCenterAndRadius(points: LatLng[]): {
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
} {
  if (!points.length) {
    return { centerLat: 0, centerLng: 0, radiusMeters: 0 };
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // rayon ≈ max distance centre → point
  let radius = 0;
  const center = { lat: centerLat, lng: centerLng };
  for (const p of points) {
    const d = computeDistanceMeters([center, p]);
    if (d > radius) radius = d;
  }

  return {
    centerLat,
    centerLng,
    radiusMeters: Math.round(radius),
  };
}

import { z } from 'zod';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 15000;

const NominatimResponseSchema = z.array(z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string().optional()
}));

const OsrmResponseSchema = z.object({
  code: z.string(),
  routes: z.array(z.object({
    distance: z.number(),
    duration: z.number()
  })).optional()
});

export interface Coordinates {
  lat: number;
  lon: number;
}

interface SuccessResult {
  ok: true;
  distanceKm: number;
  durationMinutes: number;
}

export interface ErrorResult {
  ok: false;
  error: string;
}

export type RouteResult = SuccessResult | ErrorResult;

const COORD_PATTERN = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;

export function isValidCoordinates(coords: Coordinates): boolean {
  return coords.lat >= -90 && coords.lat <= 90 &&
         coords.lon >= -180 && coords.lon <= 180;
}

export function parseCoordinates(input: string): Coordinates | null {
  const match = input.trim().match(COORD_PATTERN);
  if (!match || !match[1] || !match[2]) return null;
  const coords = {
    lat: parseFloat(match[1]),
    lon: parseFloat(match[2])
  };
  return isValidCoordinates(coords) ? coords : null;
}

export function isErrorResult(result: unknown): result is ErrorResult {
  return typeof result === 'object' && result !== null && 'ok' in result && (result as { ok: unknown }).ok === false;
}

export async function geocode(address: string): Promise<Coordinates | ErrorResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'osmaps-mcp/1.0' }
    });

    if (!res.ok) {
      return { ok: false, error: `Geocoding failed: HTTP ${res.status}` };
    }

    const rawData = await res.json();
    const parseResult = NominatimResponseSchema.safeParse(rawData);

    if (!parseResult.success || parseResult.data.length === 0) {
      return { ok: false, error: `Address not found: ${address}` };
    }

    const result = parseResult.data[0];
    if (!result) {
      return { ok: false, error: `Address not found: ${address}` };
    }
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon)
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Geocoding request timed out' };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Geocoding error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function resolveLocation(input: string): Promise<Coordinates | ErrorResult> {
  const coords = parseCoordinates(input);
  if (coords) return coords;

  return geocode(input);
}

export async function fetchRouteDistance(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${OSRM_URL}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'osmaps-mcp/1.0' }
    });

    if (!res.ok) {
      return { ok: false, error: `Routing failed: HTTP ${res.status}` };
    }

    const rawData = await res.json();
    const parseResult = OsrmResponseSchema.safeParse(rawData);

    if (!parseResult.success) {
      return { ok: false, error: 'Invalid routing response' };
    }

    const data = parseResult.data;

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return { ok: false, error: `No route found (${data.code})` };
    }

    const route = data.routes[0];
    if (!route) {
      return { ok: false, error: `No route found (${data.code})` };
    }

    return {
      ok: true,
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Routing request timed out' };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Routing error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

interface Coordinates {
  lat: number;
  lon: number;
}

interface SuccessResult {
  ok: true;
  distanceKm: number;
  durationMinutes: number;
}

interface ErrorResult {
  ok: false;
  error: string;
}

type RouteResult = SuccessResult | ErrorResult;

const COORD_PATTERN = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;

function parseCoordinates(input: string): Coordinates | null {
  const match = input.trim().match(COORD_PATTERN);
  if (!match || !match[1] || !match[2]) return null;
  return {
    lat: parseFloat(match[1]),
    lon: parseFloat(match[2])
  };
}

async function geocode(address: string): Promise<Coordinates | ErrorResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'gmaps-mcp/1.0' }
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

async function resolveLocation(input: string): Promise<Coordinates | ErrorResult> {
  const coords = parseCoordinates(input);
  if (coords) return coords;

  return geocode(input);
}

async function fetchRouteDistance(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${OSRM_URL}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'gmaps-mcp/1.0' }
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

const server = new McpServer({
  name: 'route-distance-server',
  version: '2.0.0'
});

server.tool(
  'get-route-distance',
  'Calculate driving route distance and travel time between two locations using OSRM (OpenStreetMap). Works with addresses or coordinates (lat,lng format).',
  {
    origin: z.string().min(1, 'Origin cannot be empty').describe('Starting location - address or lat,lng coordinates (e.g., "52.52,13.40")'),
    destination: z.string().min(1, 'Destination cannot be empty').describe('Ending location - address or lat,lng coordinates')
  },
  async ({ origin, destination }) => {
    const originResult = await resolveLocation(origin);

    if ('ok' in originResult && !originResult.ok) {
      return { content: [{ type: 'text', text: originResult.error }] };
    }

    const destResult = await resolveLocation(destination);

    if ('ok' in destResult && !destResult.ok) {
      return { content: [{ type: 'text', text: destResult.error }] };
    }

    const originCoords = originResult as Coordinates;
    const destCoords = destResult as Coordinates;

    const result = await fetchRouteDistance(originCoords, destCoords);

    if (!result.ok) {
      return { content: [{ type: 'text', text: result.error }] };
    }

    return {
      content: [{
        type: 'text',
        text: `${result.distanceKm.toFixed(2)} km, ${result.durationMinutes.toFixed(0)} min`
      }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
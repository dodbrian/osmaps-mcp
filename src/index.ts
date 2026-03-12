#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { resolveLocation, fetchRouteDistance, isErrorResult } from './services.js';

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
    const [originResult, destResult] = await Promise.all([
      resolveLocation(origin),
      resolveLocation(destination)
    ]);

    if (isErrorResult(originResult)) {
      process.stderr.write(`Origin error: ${originResult.error}\n`);
      return { content: [{ type: 'text', text: originResult.error }] };
    }

    if (isErrorResult(destResult)) {
      process.stderr.write(`Destination error: ${destResult.error}\n`);
      return { content: [{ type: 'text', text: destResult.error }] };
    }

    const result = await fetchRouteDistance(originResult, destResult);

    if (!result.ok) {
      process.stderr.write(`Routing error: ${result.error}\n`);
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

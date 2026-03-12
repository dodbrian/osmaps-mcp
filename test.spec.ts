import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { parseCoordinates, isValidCoordinates } from './src/services.js';

describe('parseCoordinates', () => {
  it('parses valid lat,lon string', () => {
    expect(parseCoordinates('52.52,13.40')).toEqual({ lat: 52.52, lon: 13.40 });
  });

  it('parses with spaces', () => {
    expect(parseCoordinates('52.52, 13.40')).toEqual({ lat: 52.52, lon: 13.40 });
  });

  it('parses negative coordinates', () => {
    expect(parseCoordinates('-33.86,151.20')).toEqual({ lat: -33.86, lon: 151.20 });
  });

  it('returns null for invalid format', () => {
    expect(parseCoordinates('invalid')).toBeNull();
    expect(parseCoordinates('52.52')).toBeNull();
  });
});

describe('isValidCoordinates', () => {
  it('accepts valid coordinates', () => {
    expect(isValidCoordinates({ lat: 0, lon: 0 })).toBe(true);
    expect(isValidCoordinates({ lat: 90, lon: 180 })).toBe(true);
    expect(isValidCoordinates({ lat: -90, lon: -180 })).toBe(true);
  });

  it('rejects invalid latitude', () => {
    expect(isValidCoordinates({ lat: 91, lon: 0 })).toBe(false);
    expect(isValidCoordinates({ lat: -91, lon: 0 })).toBe(false);
  });

  it('rejects invalid longitude', () => {
    expect(isValidCoordinates({ lat: 0, lon: 181 })).toBe(false);
    expect(isValidCoordinates({ lat: 0, lon: -181 })).toBe(false);
  });
});

describe('get-route-distance tool', () => {
  let client: Client;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: 'osmaps-mcp',
      args: []
    });

    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, { capabilities: {} });

    await client.connect(transport);
  });

  it('calculates distance between Berlin and Paris', async () => {
    const result = await client.callTool({
      name: 'get-route-distance',
      arguments: {
        origin: 'Berlin, Germany',
        destination: 'Paris, France'
      }
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0].text;
    expect(text).toMatch(/\d+\.\d+ km, \d+ min/);
    expect(text).toContain('1052');
  });

  it('calculates distance using coordinates', async () => {
    const result = await client.callTool({
      name: 'get-route-distance',
      arguments: {
        origin: '52.52,13.40',
        destination: '48.85,2.35'
      }
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0].text;
    expect(text).toMatch(/\d+\.\d+ km, \d+ min/);
  });

  it('handles out-of-range coordinates via geocode fallback', async () => {
    const result = await client.callTool({
      name: 'get-route-distance',
      arguments: {
        origin: '999,999',
        destination: 'Paris, France'
      }
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0].text;
    expect(text).toMatch(/\d+\.\d+ km, \d+ min/);
  });

  it('handles non-existent address', async () => {
    const result = await client.callTool({
      name: 'get-route-distance',
      arguments: {
        origin: 'ThisPlaceDoesNotExist12345',
        destination: 'Paris, France'
      }
    });

    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toContain('not found');
  });
});

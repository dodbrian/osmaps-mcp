# AGENTS.md - Guidelines for AI Coding Agents

## Build/Lint/Test Commands

```bash
npm install              # Install dependencies
npm run build            # Build TypeScript to dist/
npm run lint             # Run ESLint on src/
npm run lint:fix         # Run ESLint with auto-fix
npm test                 # Run all tests with Vitest
npm run test:watch       # Run tests in watch mode
vitest run -t "test name"  # Run a single test by name pattern
npm run start            # Run the MCP server
```

## Project Architecture

This is an MCP (Model Context Protocol) server that provides route distance calculations using:
- **OSRM** - Free routing service (no API key)
- **Nominatim** - Free geocoding service (no API key)

Entry point: `src/index.ts`
Services: `src/services.ts` (geocoding, routing, coordinate parsing)
Tests: `tests/test.spec.ts`

## Code Style Guidelines

### Imports
```typescript
// Use named imports from SDK submodules
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Use .js extension for local ES module imports
import { resolveLocation, fetchRouteDistance } from './services.js';

// Use type-only imports where appropriate (enforced by ESLint)
import type { SomeType } from 'module';
```

### TypeScript Configuration
- Target: ES2022
- Module: NodeNext (ES modules)
- Strict mode enabled with additional checks:
  - `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
  - `noUncheckedIndexedAccess` - must handle undefined array access
  - `noImplicitOverride`, `noPropertyAccessFromIndexSignature`
  - `exactOptionalPropertyTypes`

### Naming Conventions
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `REQUEST_TIMEOUT_MS`, `NOMINATIM_URL`)
- **Functions:** `camelCase` (e.g., `fetchRouteDistance`, `parseCoordinates`)
- **Interfaces/Types:** `PascalCase` (e.g., `Coordinates`, `RouteResult`)
- **Discriminated unions:** Use `ok: true | false` as discriminator

### Error Handling Pattern
Use discriminated unions for results that can fail:

```typescript
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
```

When consuming: check `result.ok` before accessing success properties.

### Async Error Handling
Always handle AbortController timeouts:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

try {
  const res = await fetch(url, { signal: controller.signal });
  // ... handle response
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    return { ok: false, error: 'Request timed out' };
  }
  return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
} finally {
  clearTimeout(timeoutId);
}
```

### Zod Validation
Use Zod schemas to validate external API responses:

```typescript
const ResponseSchema = z.object({
  field: z.string(),
  optional: z.number().optional()
});

const parseResult = ResponseSchema.safeParse(rawData);
if (!parseResult.success) {
  return { ok: false, error: 'Invalid response' };
}
const data = parseResult.data;
```

### ESLint Rules (Do Not Violate)
- `@typescript-eslint/consistent-type-imports`: Use `import type` for types only
- `@typescript-eslint/no-unused-vars`: Unused vars error (prefix with `_` to ignore)
- `@typescript-eslint/no-non-null-assertion`: No `!` assertions
- `no-console`: Use `process.stderr.write()` for errors instead

### Code Formatting
- Indent: 2 spaces
- Semicolons: Required
- Quotes: Single quotes for strings (match existing code)
- Trailing commas: None in ES5, but acceptable in TypeScript

### MCP Tool Definition Pattern

```typescript
server.tool(
  'tool-name',
  'Tool description',
  {
    param1: z.string().min(1, 'Param cannot be empty').describe('Param description'),
    param2: z.string().describe('Param description')
  },
  async ({ param1, param2 }) => {
    // Implementation
    return {
      content: [{ type: 'text', text: 'Result string' }]
    };
  }
);
```

### Test Pattern (Vitest)
```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('functionName', () => {
  it('does something specific', () => {
    expect(actual).toEqual(expected);
  });
});
```

### File Organization
- `src/index.ts` - MCP server setup and tool definitions
- `src/services.ts` - Business logic (geocoding, routing, utilities)
- `tests/test.spec.ts` - Test file

### External API Calls
- Always include `User-Agent` header
- Use 15 second timeout default (`REQUEST_TIMEOUT_MS = 15000`)
- Handle HTTP errors gracefully: return `{ ok: false, error: \`API failed: HTTP \${status}\` }`

### Type Safety Patterns
```typescript
// Avoid: non-null assertions
const item = array[0]!;  // ❌

// Prefer: guard checks
const item = array[0];
if (!item) return { ok: false, error: 'No item' };  // ✓

// Avoid: any
function process(data: any) { }  // ❌

// Prefer: unknown with type guards
function process(data: unknown) {
  if (err instanceof Error) { /* ... */ }
}
```

## Before Committing
1. Run `npm run lint` - fix all errors
2. Run `npm run build` - must compile without errors
3. Run `npm test` - all tests must pass

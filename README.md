# osmaps-mcp

MCP server for route distance calculations using OSRM and Nominatim.

## Features

- **Route Distance**: Calculate driving distance and travel time between two locations
- **Geocoding**: Converts addresses to coordinates using Nominatim (OpenStreetMap)
- **Coordinate Support**: Accepts both addresses and lat,lng coordinates
- **No API Key Required**: Uses free OpenStreetMap services

## Requirements

- Node.js 18+

## Installation

```bash
npm install
npm run setup
```

This builds the project and links the `osmaps-mcp` binary globally.

## Configuration

After running `npm run setup`, configure your MCP client to use `osmaps-mcp`:

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "osmaps": {
      "command": "osmaps-mcp"
    }
  }
}
```

### Claude Code

Add via CLI:

```bash
claude mcp add --transport stdio osmaps -- osmaps-mcp
```

Or add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "osmaps": {
      "command": "osmaps-mcp"
    }
  }
}
```

### Cursor

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "osmaps": {
      "command": "osmaps-mcp"
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "osmaps": {
      "command": "osmaps-mcp"
    }
  }
}
```

### OpenCode

Add to your `opencode.json` config file:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "osmaps": {
      "type": "local",
      "command": ["osmaps-mcp"],
      "enabled": true
    }
  }
}
```

## Tools

### get-route-distance

Calculate driving route distance and travel time between two locations.

**Parameters:**
- `origin` - Starting location (address or lat,lng coordinates)
- `destination` - Ending location (address or lat,lng coordinates)

**Example:**
```
origin: "Berlin, Germany"
destination: "Paris, France"
```
Returns: `452.31 km, 265 min`

**Coordinate example:**
```
origin: "52.5200,13.4050"
destination: "48.8566,2.3522"
```

## APIs Used

- [OSRM](http://router.project-osrm.org/) - Open Source Routing Machine (free, no API key)
- [Nominatim](https://nominatim.openstreetmap.org/) - OpenStreetMap geocoding (free, no API key)

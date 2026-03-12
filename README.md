# osmaps-mcp

MCP server for route distance calculations using OSRM and Nominatim.

## Features

- **Route Distance**: Calculate driving distance and travel time between two locations
- **Geocoding**: Converts addresses to coordinates using Nominatim (OpenStreetMap)
- **Coordinate Support**: Accepts both addresses and lat,lng coordinates

## Requirements

- Node.js 18+

## Installation

```bash
npm install
npm run build
```

## Usage

This is an MCP (Model Context Protocol) server. Use with LLM assistants that support MCP tool calling.

```bash
npm start
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

## APIs Used

- [OSRM](https://router.project-osrm.org/) - Open Source Routing Machine
- [Nominatim](https://nominatim.openstreetmap.org/) - OpenStreetMap geocoding

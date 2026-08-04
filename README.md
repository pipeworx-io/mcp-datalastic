# mcp-datalastic

Datalastic MCP — live AIS vessel positions (datalastic.com)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `datalastic_vessel` | Where is ship <imo/mmsi> — live AIS position + destination for a single vessel. Locate a ship by its IMO number, MMSI, or Datalastic UUID; returns current lat/lon, speed, course, heading, destination and navigation status. Example: datalastic_vessel({ imo: "9302947", _apiKey: "your-key" }) |
| `datalastic_vessels_in_radius` | Find vessels within <radius> nm of a lat/lon — live AIS positions of all ships near a point. Returns each ship's name, IMO, MMSI, position, speed, course, destination and type. Example: datalastic_vessels_in_radius({ lat: 51.95, lon: 1.28, radius: 20, _apiKey: "your-key" }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "datalastic": {
      "url": "https://gateway.pipeworx.io/datalastic/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Datalastic data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

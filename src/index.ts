interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Datalastic MCP — live AIS vessel positions (datalastic.com)
 *
 * Tools:
 * - datalastic_vessel: locate a single ship by IMO / MMSI / UUID (live AIS position + destination)
 * - datalastic_vessels_in_radius: list ships within N nautical miles of a lat/lon
 *
 * Requires a Datalastic API key via the _apiKey parameter (sent as the `api-key`
 * query param). Get one (with a trial) at datalastic.com.
 */


const BASE_URL = 'https://api.datalastic.com/api/v0';

const tools: McpToolExport['tools'] = [
  {
    name: 'datalastic_vessel',
    description:
      'Where is ship <imo/mmsi> — live AIS position + destination for a single vessel. Locate a ship by its IMO number, MMSI, or Datalastic UUID; returns current lat/lon, speed, course, heading, destination and navigation status. Example: datalastic_vessel({ imo: "9302947", _apiKey: "your-key" })',
    inputSchema: {
      type: 'object',
      properties: {
        imo: {
          type: 'string',
          description: 'Vessel IMO number, e.g. "9302947" (provide at least one of imo/mmsi/uuid)',
        },
        mmsi: {
          type: 'string',
          description: 'Vessel MMSI number, e.g. "477995900" (provide at least one of imo/mmsi/uuid)',
        },
        uuid: {
          type: 'string',
          description: 'Datalastic vessel UUID (provide at least one of imo/mmsi/uuid)',
        },
        _apiKey: {
          type: 'string',
          description: 'Datalastic API key (get one with a trial at datalastic.com)',
        },
      },
      required: ['_apiKey'],
    },
  },
  {
    name: 'datalastic_vessels_in_radius',
    description:
      'Find vessels within <radius> nm of a lat/lon — live AIS positions of all ships near a point. Returns each ship\'s name, IMO, MMSI, position, speed, course, destination and type. Example: datalastic_vessels_in_radius({ lat: 51.95, lon: 1.28, radius: 20, _apiKey: "your-key" })',
    inputSchema: {
      type: 'object',
      properties: {
        lat: {
          type: 'number',
          description: 'Center latitude in decimal degrees, e.g. 51.95',
        },
        lon: {
          type: 'number',
          description: 'Center longitude in decimal degrees, e.g. 1.28',
        },
        radius: {
          type: 'number',
          description: 'Search radius in nautical miles, e.g. 20',
        },
        _apiKey: {
          type: 'string',
          description: 'Datalastic API key (get one with a trial at datalastic.com)',
        },
      },
      required: ['lat', 'lon', 'radius', '_apiKey'],
    },
  },
];

// Shared GET helper. Datalastic sends the key as the `api-key` query param
// (literally hyphenated) and wraps successful payloads under a `data` key.
async function dlGet(
  path: string,
  params: Record<string, string>,
  apiKey: string,
  tool: string,
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ 'api-key': apiKey, ...params });
  const res = await fetch(`${BASE_URL}${path}?${qs}`);

  if (res.status === 401) {
    throw new Error(
      `Datalastic ${tool}: auth failed (HTTP 401) — check your Datalastic _apiKey. Get a valid key (with a trial) at datalastic.com.`,
    );
  }
  if (!res.ok) {
    throw new Error(`Datalastic ${tool} error: HTTP ${res.status}`);
  }

  const body = (await res.json()) as { data?: unknown };
  const data = body?.data;
  if (!data || typeof data !== 'object') {
    throw new Error(`Datalastic ${tool}: no data returned for the given query.`);
  }
  return data as Record<string, unknown>;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string | undefined;
  delete args._apiKey;

  if (!apiKey) {
    throw new Error(
      'Datalastic requires an API key. Pass it via the `_apiKey` argument — get one (with a trial) at datalastic.com.',
    );
  }

  switch (name) {
    case 'datalastic_vessel':
      return getVessel(args, apiKey);
    case 'datalastic_vessels_in_radius':
      return getVesselsInRadius(args, apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function getVessel(args: Record<string, unknown>, apiKey: string) {
  const imo = args.imo as string | undefined;
  const mmsi = args.mmsi as string | undefined;
  const uuid = args.uuid as string | undefined;

  const params: Record<string, string> = {};
  if (imo) params.imo = imo;
  else if (mmsi) params.mmsi = mmsi;
  else if (uuid) params.uuid = uuid;
  else throw new Error('Datalastic datalastic_vessel requires one of: provide imo, mmsi, or uuid.');

  const data = await dlGet('/vessel', params, apiKey, 'datalastic_vessel');

  return {
    name: data.name ?? null,
    imo: data.imo ?? null,
    mmsi: data.mmsi ?? null,
    lat: data.lat ?? null,
    lon: data.lon ?? null,
    speed: data.speed ?? null,
    course: data.course ?? null,
    heading: data.heading ?? null,
    destination: data.destination ?? null,
    nav_status: data.navigation_status ?? null,
    last_position_epoch: data.last_position_UTC ?? data.last_position_epoch ?? null,
    type: data.type ?? null,
  };
}

async function getVesselsInRadius(args: Record<string, unknown>, apiKey: string) {
  const lat = args.lat as number;
  const lon = args.lon as number;
  const radius = args.radius as number;

  const data = await dlGet(
    '/vessel_inradius',
    { lat: String(lat), lon: String(lon), radius: String(radius) },
    apiKey,
    'datalastic_vessels_in_radius',
  );

  // The array of vessels arrives under `vessels` or (defensively) `points`.
  const raw = data.vessels ?? data.points;
  const list = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];

  const vessels = list.slice(0, 100).map((v) => ({
    name: v.name ?? null,
    imo: v.imo ?? null,
    mmsi: v.mmsi ?? null,
    lat: v.lat ?? null,
    lon: v.lon ?? null,
    speed: v.speed ?? null,
    course: v.course ?? null,
    destination: v.destination ?? null,
    type: v.type ?? null,
  }));

  return {
    lat,
    lon,
    radius,
    count: vessels.length,
    vessels,
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;

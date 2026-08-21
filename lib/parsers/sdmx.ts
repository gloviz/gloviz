/**
 * SDMX-JSON 1.0 parser, written once and reused by every SDMX source
 * (OECD today, any other SDMX provider later).
 *
 * Requires `dimensionAtObservation=AllDimensions`, which flattens the cube:
 * each observation key is a colon-separated list of indices into
 * structure.dimensions.observation, in that order.
 */

export interface SdmxPoint {
  /** dimension id -> code, e.g. { REF_AREA: 'NOR', TIME_PERIOD: '2026-01' } */
  dims: Record<string, string>;
  value: number | null;
}

export function parseSdmxJson(body: any): SdmxPoint[] {
  const data = body?.data ?? body;
  const dims: { id: string; values: { id: string; name?: string }[] }[] =
    data?.structure?.dimensions?.observation ?? [];
  const dataSet = data?.dataSets?.[0];
  if (!dims.length || !dataSet?.observations) return [];

  const out: SdmxPoint[] = [];
  for (const [key, arr] of Object.entries<any>(dataSet.observations)) {
    const idx = key.split(':').map(Number);
    if (idx.length !== dims.length) continue; // shape we do not understand
    const codes: Record<string, string> = {};
    idx.forEach((i, n) => {
      const v = dims[n].values[i];
      if (v) codes[dims[n].id] = v.id;
    });
    const raw = Array.isArray(arr) ? arr[0] : arr;
    out.push({ dims: codes, value: raw === null || raw === undefined ? null : Number(raw) });
  }
  return out;
}

/** SDMX periods: 2026, 2026-Q1, 2026-01, 2026-01-15. Always UTC. */
export function sdmxPeriodToIso(period: string): string | null {
  const p = period.trim();
  let m = /^(\d{4})$/.exec(p);
  if (m) return `${m[1]}-01-01T00:00:00Z`;
  m = /^(\d{4})-?Q([1-4])$/.exec(p);
  if (m) return `${m[1]}-${String((Number(m[2]) - 1) * 3 + 1).padStart(2, '0')}-01T00:00:00Z`;
  m = /^(\d{4})-?S([12])$/.exec(p);
  if (m) return `${m[1]}-${m[2] === '1' ? '01' : '07'}-01T00:00:00Z`;
  m = /^(\d{4})-(\d{2})$/.exec(p);
  if (m) return `${m[1]}-${m[2]}-01T00:00:00Z`;
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p);
  if (m) return `${p}T00:00:00Z`;
  m = /^(\d{4})M(\d{2})$/.exec(p);
  if (m) return `${m[1]}-${m[2]}-01T00:00:00Z`;
  // IMF SDMX-CSV writes 2026-M07 and 2026-Q2
  m = /^(\d{4})-M(\d{2})$/.exec(p);
  if (m) return `${m[1]}-${m[2]}-01T00:00:00Z`;
  return null;
}

/**
 * SDMX-CSV 2.0, the format the IMF's SDMX 3.0 service actually serves reliably
 * (its JSON responses 500 or come back empty). Header row names the dimensions;
 * every row is one observation.
 */
export function parseSdmxCsv(text: string): SdmxPoint[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const split = (line: string): string[] => {
    const cells: string[] = [];
    let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { quoted = !quoted; continue; }
      if (ch === ',' && !quoted) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    return cells;
  };
  const header = split(lines[0]);
  const out: SdmxPoint[] = [];
  for (const line of lines.slice(1)) {
    const cells = split(line);
    const dims: Record<string, string> = {};
    header.forEach((h, i) => { if (cells[i]) dims[h] = cells[i]; });
    const raw = dims.OBS_VALUE;
    if (raw === undefined) continue;
    const value = Number(raw);
    out.push({ dims, value: Number.isFinite(value) ? value : null });
  }
  return out;
}

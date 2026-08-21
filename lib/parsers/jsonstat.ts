/**
 * JSON-stat 2.0 parser, written once and reused by every JSON-stat source
 * (Eurostat today; SSB, SCB and Statistics Finland use the same format).
 *
 * The cube is flat: `value` is keyed by a single integer index into the
 * product of `size`, in the order given by `id`.
 */

export interface JsonStatPoint {
  /** dimension id -> category code, e.g. { geo: 'NO', time: '2026-07' } */
  dims: Record<string, string>;
  value: number | null;
}

export function parseJsonStat(body: any): JsonStatPoint[] {
  const ids: string[] = body?.id ?? [];
  const size: number[] = body?.size ?? [];
  const dimension = body?.dimension ?? {};
  if (!ids.length || ids.length !== size.length) return [];

  // Position -> code, per dimension.
  const codesByDim: string[][] = ids.map((id) => {
    const index = dimension[id]?.category?.index;
    if (!index) return [];
    if (Array.isArray(index)) return index as string[];
    const arr: string[] = [];
    for (const [code, pos] of Object.entries<number>(index)) arr[pos] = code;
    return arr;
  });

  // Strides for the row-major flattening JSON-stat uses.
  const strides = new Array(ids.length).fill(1);
  for (let i = ids.length - 2; i >= 0; i--) strides[i] = strides[i + 1] * size[i + 1];

  const values = body?.value ?? {};
  const entries: [string, any][] = Array.isArray(values)
    ? values.map((v: any, i: number) => [String(i), v])
    : Object.entries(values);

  const out: JsonStatPoint[] = [];
  for (const [flat, raw] of entries) {
    if (raw === null || raw === undefined) continue;
    let rest = Number(flat);
    const dims: Record<string, string> = {};
    ids.forEach((id, i) => {
      const pos = Math.floor(rest / strides[i]);
      rest -= pos * strides[i];
      dims[id] = codesByDim[i][pos];
    });
    out.push({ dims, value: Number(raw) });
  }
  return out;
}

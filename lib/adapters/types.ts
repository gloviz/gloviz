export interface FetchWindow {
  /** inclusive, UTC */
  start: Date;
  /** exclusive, UTC */
  end: Date;
}

export interface SeriesPayload {
  externalId: string;
  title: string;
  domain: string;
  geoCode: string;
  unit: string;
  frequency: string;
  metadata?: Record<string, unknown>;
  observations: { ts: string; value: number | null }[];
}

export interface Adapter {
  /** matches sources.id */
  sourceId: string;
  /** e.g. 'entsoe:day-ahead' */
  job: string;
  fetch(window: FetchWindow): Promise<SeriesPayload[]>;
}

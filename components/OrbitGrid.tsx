'use client';

import { useEffect, useRef } from 'react';
import { ensureHighcharts } from '@/lib/loadHighcharts';

declare global {
  interface Window { Grid?: any }
}

/**
 * A Highcharts Grid opted into Orbit. In page mode the grid is its own content:
 * its rows filter with the charts, and the AI tools read the table.
 */
export default function OrbitGrid({
  gridId, title, subtitle, columns, attribution, iconHtml, note,
}: {
  gridId: string;
  title: string;
  subtitle?: string;
  /** column name -> values, in row order */
  columns: Record<string, (string | number | null)[]>;
  attribution?: string;
  iconHtml?: string;
  note?: string;
}) {
  const destroyed = useRef(false);

  useEffect(() => {
    destroyed.current = false;
    let grid: any;
    (async () => {
      await ensureHighcharts();
      const G = window.Grid;
      if (destroyed.current || !G?.grid) return;
      try {
        grid = G.grid(gridId, {
          orbit: {
            enabled: true,
            id: gridId,
            tools: ['summary', 'distribution', 'kpi', 'contribution', 'correlations',
                    'insights', 'narrate', 'ai', 'filter', 'export', 'fullscreen', 'share'],
            ...(note ? { llmContext: { text: [note] } } : {}),
          },
          data: { columns },
          rendering: { rows: { strictHeights: true } },
          columnDefaults: { sorting: { sortable: true } },
        });
      } catch (err) {
        console.warn('grid failed', err);
      }
    })();
    return () => {
      destroyed.current = true;
      try { grid?.destroy(); } catch { /* orbit may own it */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridId]);

  return (
    <div className="card chartwrap">
      <div className="ch">
        {iconHtml && <span className="chip" dangerouslySetInnerHTML={{ __html: iconHtml }} />}
        <div><b>{title}</b>{subtitle && <small>{subtitle}</small>}</div>
      </div>
      <div id={gridId} className="gridwrap" style={{ marginTop: 10 }} />
      {attribution && <div className="cfoot"><span>{attribution}</span></div>}
    </div>
  );
}

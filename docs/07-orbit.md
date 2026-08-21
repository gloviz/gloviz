# 07 · Highcharts Orbit

Everything GLOVIZ needs to use Orbit correctly. **Orbit is used on every chart in
the product; a plain Highcharts chart is never shipped.**

---

## Installation (GLOVIZ)

| | |
|---|---|
| Org | `pax-den` |
| API key | `5150599f-09f3-4b54-a398-e60cb01da393` |
| Module URL | `https://orbit.highsoftlabs.com/module/5150599f-09f3-4b54-a398-e60cb01da393/orbit.js` |
| In the repo | `app/layout.tsx`, after the Highcharts scripts, `strategy="beforeInteractive"` |
| Env var | `NEXT_PUBLIC_ORBIT_API_KEY` (set in Vercel; the layout falls back to the key above) |

Portal: <https://orbit.highsoftlabs.com/portal> · Product page:
<https://www.highcharts.com/products/orbit/>

### Five rules assistants and humans get wrong

1. **Orbit is served only from the keyed module URL.** Not npm, not
   code.highcharts.com, not any CDN.
2. **The Orbit script must load after Highcharts core and every Highcharts
   module.** Loading it earlier fails silently.
3. **The script tag alone does nothing.** A chart opts in with
   `orbit: { enabled: true }`, or the whole page opts in with Page Mode.
4. **Linking charts requires Page Mode.** Setting `enabled: true` on several
   charts does not link them, and hand-written cross-filter code is wasted work.
5. **`share` is off by default** and must be whitelisted explicitly in `tools`.

### Operational limits

- **Referrer allowlist:** if Allowed referrers is configured for the
  installation, the module is served only to those origins. `gloviz.app` must be
  on that list, or visitors get nothing.
- **Rate limits:** requests beyond the installation's limit return HTTP 429 with
  `Retry-After` (seconds). Covers both the module script and runtime API calls.
  Org default and per-installation limit both apply; the stricter wins.
- A deactivated installation stops serving immediately.

---

## Per-chart configuration

```js
Highcharts.chart('container', {
  orbit: {
    enabled: true,
    id: 'temperature-chart',            // stable id for relationship targets
    tools: ['summary', 'forecast', 'anomaly', 'ai'],
    menuVisibility: 'always',           // 'always' | 'auto' | 'compact'
    initialTool: 'insights',
    llmContext: { text: ['Hourly UTC, ingested from Open-Meteo.'] }
  },
  series: [{ name: 'Oslo', data: [] }]
});
```

| Option | Default | Notes |
|---|---|---|
| `enabled` | `false` | Ignored when `configure({ applyToAll: true })` is on |
| `id` | renderTo id | Readable id for `relationships` targets |
| `tools` | all available | Must also pass any global whitelist |
| `initialTool` | none | Opens as if clicked; alternate views take over the chart |
| `menuVisibility` | `'always'` | `auto` = on hover/focus, `compact` = sparkle toggle |
| `allowPinning` | `true` | Page-mode feature only |
| `allowToolPopout` | `true` | Panel pops into a movable window |
| `toolPaneTarget` / `toolbarTarget` | none | Render panel/toolbar into your own container; `toolbarTarget` forces `menuVisibility: 'always'` |
| `llmContext` | none | `{ htmlNodes, text }`, merged with page-wide context |
| `relationships` | none | Declared cross-content links, see below |

### Global configuration

```js
Highcharts.orbit.configure({
  applyToAll: true,          // attach to every chart, ignoring per-chart enabled
  tools: [...],              // page-wide whitelist
  menuVisibility: 'always',
  pageKey: 'gloviz-dashboard',
  llmContext: { text: ['All timestamps are UTC.'] }
});
```

`apiUrl` and `apiKey` are read from the module URL. Never set them manually
unless Orbit is proxied through another host.

### Manual attachment

```js
const handle = Highcharts.orbit.attachToChart(chart, { tools, menuVisibility, height });
handle.destroy();            // restores the original element
```

`attachToGrid(grid, options)` is the Grid equivalent. Both return
`{ contentId, kind, destroy() }` or `null`.

---

## Tool reference

Chart-scope tool ids (the complete list; do not invent others):

| Group | ids |
|---|---|
| Alternate views | `summary` `distribution` `kpi` |
| Analysis | `correlations` `contribution` `anomaly` `control-limits` `forecast` `trendline` `indicators` |
| AI | `insights` `narrate` `ai` `altviz` |
| Transform | `filter` `derived` |
| Chrome | `fullscreen` `history` `export` `annotate` `grid` `share` |

**Module requirements.** `export` needs `modules/exporting.js`; `annotate` needs
`modules/annotations.js`; `indicators` needs the Stock indicator series types;
`grid` needs Highcharts Grid. Forecast confidence bands need `arearange` (the
line still renders without it). A tool whose requirement is missing is simply
hidden.

**Alternate views** (`summary`, `distribution`, `kpi`) replace the chart instead
of opening a panel, and are reached through the toolbar's View picker.

**Layers.** `anomaly`, `control-limits`, `forecast`, `trendline`, `indicators`,
`filter`, `derived`, `annotate`, `ai` and `altviz` record their changes as
layers: toggleable and removable from the Layers panel, they survive chart
rebuilds and are included in exports. Nothing is destructive.

Runtime introspection:

```js
Highcharts.orbit.getRegisteredTools({ scope: 'chart' });
Highcharts.orbit.getRegisteredTools({ scope: 'chart', includeUnavailable: true });
Highcharts.orbit.getToolIds();
```

### Where the tools run

- **Client-side only** (nothing leaves the browser): the whole Analyze plugin,
  Transform, Annotate, Export, Highlights.
- **Server-side** (chart data is sent to Orbit): `ai`, `insights`, `narrate`,
  `altviz`, `page-chat`, `page-insights`. Credits: chat 2, the others 1 per call.

---

## Page Mode

One call after the charts exist. GLOVIZ uses augment mode on `/dashboard`
(`components/OrbitPageMode.tsx`).

```js
const page = Highcharts.orbitPage({ mode: 'augment', pageKey: 'gloviz-dashboard' });
page.refresh();   // re-scan for content added later that doesn't attach itself
page.destroy();   // tear down (SPA navigation)
```

| Option | Default | Notes |
|---|---|---|
| `mode` | `'augment'` | `rebuild` swaps the content area for a draggable dashboard grid |
| `relationships` | none | Manifest, tolerance, master switch |
| `autofilter` | on | `{ enabled, include, clickToFilter, urlState }` |
| `tools` | none | `{ only: [...] }` or `{ hide: [...] }` |
| `layout` | none | Rebuild only: `1x1 1x2 2x1 2x2 1-3 2-3 3x2 1-2-3 hero-4 hero-6` |
| `pageKey` | host + path | Keys the browser-stored per-page state |

Only one page session exists at a time; further `orbitPage()` calls return the
existing handle and ignore their config.

**Page-scope tools and panels:** `page-insights` `page-chat` `page-relationships`
`page-layout` `page-share`, plus panels `page-data` `page-pinned` `page-filter`
`page-compare` `page-context`. In page mode every chart, map and Grid is attached
automatically; per-chart `enabled` is not required.

**What page mode adds for the user:** Cmd-K search across every tool and action,
linked highlighting across related charts, whole-page filters, Compare (two
categories or two time periods, drawn as bands or overlay), pinning, and
dashboard-wide Insights, Chat and Highlights.

### Relationships

Detected automatically from shared categories and matching fields; datetime axes
match within `dateToleranceMs` (default 1 hour). Declare them when detection
cannot see the link:

```js
// On the content
orbit: { relationships: [{ field: 'geo_code', to: 'gdp-chart' }, { field: 'x' }] }

// Or as a page manifest
Highcharts.orbitPage({
  relationships: {
    dateToleranceMs: 86400000,
    links: [{ a: { content: 'temp-chart', field: 'x' },
              b: { content: 'price-chart', field: 0 } }],
    disable: [/* same shape */]
  }
});
```

Link fields: `field` (name or 0-based index), `to` (id, `{contentId}`,
`{selector}`, or omit to broadcast), `targetField`, `as` (`'exact' | 'time'`),
`confidence`. Field hints (`role: 'key' | 'time' | 'category'`, `alias`,
`ignore`) nudge detection without declaring links.

Diagnostics, since config mistakes are surfaced rather than dropped:

```js
Highcharts.orbit.relationships.diagnostics();   // { unresolved, edges }
Highcharts.orbit.relationships.explain(idA, idB);
Highcharts.orbit.relationships.pick();          // let the user link two charts
```

### Auto-filter

On by default, built from the detected relationships. Time fields become a date
range; shared categories become multi-selects that narrow to what is still
reachable. Clicking a point, bar, map area or row filters the page
(`clickToFilter: false` to disable); dragging an axis filters to a range.
Filtering is non-destructive: the Data panel keeps the full set.
`urlState: true` keeps active filters in a `#...orbitf=...` hash.

---

## Maps

`Highcharts.mapChart` opts in with the same `orbit` section; `handle.kind` is
`'map'`. A map has no axis, so the axis-based tools (forecast, trendline,
indicators, anomaly, control-limits, correlations, filter, derived, altviz) are
hidden rather than left to misread the data. A map gets `grid`, `summary`,
`distribution`, `kpi`, `contribution`, the AI tools, `annotate`, `export`,
`fullscreen`, `history`, `share`.

In page mode a map joins on its area names, so give each point an explicit
`name` when your labels differ from the topology's. Filtered-out areas keep their
shape in the "no data" colour. Drawn shapes are anchored to the geography, not
the screen.

---

## AI context

The AI tools answer better with the surrounding page content. GLOVIZ marks its
KPI tiles with `data-orbit-context`:

```html
<div data-orbit-context="Live time series">938</div>
```

```js
Highcharts.orbit.context.add(el);
Highcharts.orbit.context.scan();     // after dynamic DOM updates
Highcharts.orbit.context.getAll({ contentId: 'chart-id' });
```

Config equivalent is `llmContext: { htmlNodes, text }`, page-wide or per chart;
the two merge, and an element listed in both is captured once.

---

## Sharing

`share` (chart) and `page-share` (page) put the user's changes in the URL as
`#osc=...`. The link carries **the intent of each change, never the chart data**,
and re-runs the tools against whatever the recipient's page shows. The link
points at the real page, so access control still applies. Large payloads are
stored server-side and the link carries a short code (`#osc=c.<code>`). An org
can disable sharing per installation in the portal, which overrides any page
config.

---

## Browser storage and analytics

Orbit sets **no cookies**. It uses localStorage/sessionStorage on the GLOVIZ
origin:

| Key | Storage | Purpose |
|---|---|---|
| `orbit.visitorId` | localStorage | Returning-visitor id for usage analytics |
| `orbit.sessionId` | sessionStorage | Groups one visit's events (tab, or 30 min idle) |
| `orbit:pins:<host><path>` | localStorage | Pinned charts |
| `orbit:layout:template:<host><path>` | localStorage | Rebuild-mode layout choice |
| `orbit:relationships:overrides:<host><path>` | localStorage | Disabled/promoted edges |

`pageKey` replaces the `<host><path>` part. Usage events carry the two random
ids, the event name, the API key and the page host/path; **chart data is never
sent with analytics**, only with the AI tools. Turning a feature off stops its
key being written (`allowPinning: false`, `relationships: { enabled: false }`).
Analytics itself is not configurable from the page.

This belongs in the GLOVIZ privacy note before any public launch.

---

## Using Orbit with AI assistants

Orbit postdates most assistants' training data, so they invent URLs and options.

- `https://orbit.highsoftlabs.com/llms.txt` - the hard rules
- `https://orbit.highsoftlabs.com/llms-full.txt` - full reference in one file
- Claude Code skill:

```
/plugin marketplace add https://orbit.highsoftlabs.com/claude/marketplace.json
/plugin install orbit@highcharts-orbit
```

Point any assistant at `llms-full.txt` before it writes Orbit code.

---

## Live demos (the fastest way to check behaviour)

<https://orbit.highsoftlabs.com/demos/index.html> · beta, so the API and tools
can change; the changelog is at `/changelog/`.

| Demo | What it settles |
|---|---|
| `playground.html` | Every per-chart option toggled live, config rebuilding as you go |
| `menu-visibility.html` | `always` vs `auto` (hover/focus) vs `compact` (sparkle toggle) |
| `sharing.html` | `share` only appears when whitelisted; org can still disable it |
| `popout.html` | Tool panels detaching into movable, resizable windows |
| `targets.html` | `toolbarTarget` / `toolPaneTarget` placing chrome in your own layout |
| `chart-types.html` | The same opt-in on line, stacked column, pie, scatter, polar, candlestick |
| `alternate-views.html` | Summary, distribution, KPI, contribution as in-place views |
| `analysis.html` | Anomaly, correlations, control limits, forecast, trend, derived, indicators |
| `ai-tools.html` | Insights, Narrator, Assistant reading `llmContext` and DOM context |
| `grid.html` | Orbit on a Highcharts Grid, plus the `grid` tool on charts |
| `manual-global.html` | `configure({ applyToAll })` and `attachToChart()` with a teardown handle |
| `page-mode.html` | A full dashboard: map + charts + grid filtering and comparing together |
| `llm-development.html` | The skill and llms.txt references for AI-assisted development |

### Details worth remembering from the demos

- **The tools whitelist has exactly 20 valid keys.** Anything else is invented.
- **`initialTool` must be in the `tools` list** for it to open on load.
- **Alternate views keep the View picker:** landing on `contribution` still lets
  the user switch back to the chart or to another enabled view.
- **Indicators need a datetime axis**, and only list indicator types whose series
  type is actually registered.
- **A tool shows only when its data supports it**, so one shared `tools` list
  across mixed chart types is fine: each chart shows the subset that fits.
- **Page Mode links content by shared vocabulary**: same region names, same month
  axis. That is why GLOVIZ names series by ISO3 code or city name consistently.
- **`allowPinning` does nothing outside page mode**; the pin toggle only exists in
  a page session.
- Recommended prompt habits when working with an assistant: name tools by key,
  say "use Page Mode" the moment more than one chart is involved, and have it
  check every key and URL against `llms.txt`.

---

## Capability catalogue (product page wording, for pitching GLOVIZ)

**On every chart:** Data Grid (Grid Pro table), Summary Stats, Correlations
(Pearson per pair), Anomaly Detection (Z-score, IQR, rate-of-change), Forecast
(linear regression and moving average with confidence bands), Trend Lines
(least squares with R2), Filter & Focus, Derived Series (difference, ratio,
% change, moving average, cumulative), Alt. Visualization (AI), Indicators
(SMA, EMA, Bollinger, RSI, MACD from Highcharts Stock), Insights (AI),
Narrator (AI, four tones), AI Assistant (AI chat that can modify the chart),
Draw & Annotate, Alternate Views, Sharing.

**Across the whole page:** Page Mode, Page Filters, Compare (A vs B as bands or
overlays with per-chart change), Linked Highlighting, Pinning, Page Insights &
Chat (AI), Share, Tool Search (Ctrl-K / Cmd-K).

**Client-side vs AI-powered.** Everything above is client-side except
Alt. Visualization, Insights, Narrator, AI Assistant and Page Insights & Chat,
which send chart configuration and data to the Orbit backend.

**Analytics scope, in Highsoft's own words:** anonymous analytics limited to
tool activation events (for example "opened Forecast tool"); no personal data.

### Portal (self-service, per organization)

| Area | What it controls |
|---|---|
| Installations & Keys | Create installations, manage API keys and allowed origins, per-installation activity |
| Usage & Spending | Live usage and credits, spending caps, rate limits |
| Branding & Defaults | Org-wide chart theming and defaults pushed to every installation |
| Team & Access | Members through org admins, optional 2FA requirement |

**Licence:** Orbit Beta 1.0 runs under the Early Access Customer Agreement,
<https://shop.highcharts.com/license-orbit-1.0>. Beta status means the API, the
tools and their behaviour can change, and the service can be updated or paused.
That is a real risk for gloviz.app: the app must keep degrading gracefully if the
module stops serving.

---

## How GLOVIZ uses Orbit today

| Where | What |
|---|---|
| `app/layout.tsx` | Highcharts + highcharts-more + annotations + exporting + accessibility, then the keyed Orbit module |
| `components/OrbitChart.tsx` | Every chart is created with `orbit: { enabled: true, id }`, Vinterhav series colours, and recolours on theme switch |
| `components/OrbitPageMode.tsx` | `orbitPage({ mode: 'augment', pageKey: 'gloviz-dashboard' })` once the charts exist |
| `app/dashboard/page.tsx` | ~24 charts across economy, energy, climate, environment, health and finance, so relationships, filters and Compare have something to work with |
| KPI tiles | `data-orbit-context` on the front page and dashboard |

**Still to do:** verify `gloviz.app` is on the installation's referrer allowlist;
add Highcharts Maps for the geographic series (USGS, OpenAQ) so the map tools
come into play; consider `indicators` on the FX charts once Stock indicator
modules are loaded.

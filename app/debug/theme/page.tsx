import ThemeProbe from '@/components/ThemeProbe';

export const metadata = { title: 'Theme probe · GLOVIZ' };

export default function DebugTheme() {
  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 60 }}>
      <div className="kicker">Diagnostics</div>
      <h2 style={{ marginTop: 12 }}>Theme <em>probe</em></h2>
      <p className="muted" style={{ maxWidth: '62ch', marginTop: 12 }}>
        This page renders one Orbit chart, then reports what the browser actually
        computed: the palette Highcharts ended up with, the chart background, the
        Orbit panel colours, and whether Orbit injected its own stylesheet. Press
        Copy and paste the result back into the chat.
      </p>
      <ThemeProbe />
    </main>
  );
}

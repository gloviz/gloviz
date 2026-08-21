import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { MARK_SVG } from '@/lib/artwork';

export const metadata: Metadata = {
  metadataBase: new URL('https://gloviz.app'),
  title: 'GLOVIZ: the world\'s open data, live',
  description:
    'Economy, energy, climate, health and transport for 190+ countries, streamed from the world\'s best open APIs and analyzed in the chart with Highcharts Orbit.',
};

const ORBIT_KEY = process.env.NEXT_PUBLIC_ORBIT_API_KEY ?? '5150599f-09f3-4b54-a398-e60cb01da393';

function Brand({ small }: { small?: boolean }) {
  return (
    <Link href="/" className="brand" style={small ? { fontSize: 17 } : undefined}>
      <span className="mark" dangerouslySetInnerHTML={{ __html: MARK_SVG }} />
      GLOVIZ
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dyphav">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />      </head>
      <body>
        <a href="#main" className="skiplink">Skip to content</a>
        <header className="top">
          <div className="wrap topin">
            <Brand />
            <div className="actions">
              <ThemeSwitcher />
            </div>
          </div>
        </header>
        <div id="main">{children}</div>
        <footer className="wrap foot">
          <Brand small />
          <span>Built with Highcharts Orbit</span>
          <span className="r">
            <Link href="/stories">Stories</Link>
            <Link href="/explore">Explorer</Link>
            <Link href="/status">API status</Link>
            <a href="https://www.highcharts.com/products/orbit/">Orbit</a>
            <a href="https://github.com/gloviz/gloviz">GitHub</a>
          </span>
        </footer>
      </body>
    </html>
  );
}

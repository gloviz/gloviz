import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import './globals.css';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { MARK_SVG } from '@/lib/artwork';

export const metadata: Metadata = {
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
        />
        {/* Highcharts core + modules, then Orbit (must load after; not on npm/CDN) */}
        <Script src="https://code.highcharts.com/highcharts.js" strategy="beforeInteractive" />
        <Script src="https://code.highcharts.com/highcharts-more.js" strategy="beforeInteractive" />
        <Script src="https://code.highcharts.com/modules/annotations.js" strategy="beforeInteractive" />
        <Script src="https://code.highcharts.com/modules/exporting.js" strategy="beforeInteractive" />
        <Script src="https://code.highcharts.com/modules/accessibility.js" strategy="beforeInteractive" />
        <Script src={`https://orbit.highsoftlabs.com/module/${ORBIT_KEY}/orbit.js`} strategy="beforeInteractive" />
      </head>
      <body>
        <header className="top">
          <div className="wrap topin">
            <Brand />
            <nav className="nav">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/#domains">Domains</Link>
              <Link href="/#orbit">Analysis</Link>
              <Link href="/#sources">Sources</Link>
              <Link href="/status">Status</Link>
            </nav>
            <div className="actions">
              <ThemeSwitcher />
              <Link href="/dashboard" className="btn amber">Open the app</Link>
            </div>
          </div>
        </header>
        {children}
        <footer className="wrap foot">
          <Brand small />
          <span>Built with Highcharts Orbit</span>
          <span className="r">
            <Link href="/status">API status</Link>
            <a href="https://www.highcharts.com/products/orbit/">Orbit</a>
            <a href="https://github.com/gloviz/gloviz">GitHub</a>
          </span>
        </footer>
      </body>
    </html>
  );
}

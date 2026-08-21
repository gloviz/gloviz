import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GLOVIZ, the world\'s open data, live';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: '#0a1017', color: '#e6ecf0',
        padding: '72px 80px', fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 999, background: '#dda765',
          }} />
          <div style={{
            fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', color: '#93a3b3',
          }}>Live open data observatory</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 104, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
            GLOVIZ
          </div>
          <div style={{ fontSize: 40, color: '#8fb3c9', letterSpacing: -1 }}>
            The world&apos;s data, live.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 22, color: '#647587' }}>
          <span>Economy</span><span>Energy</span><span>Climate</span>
          <span>Environment</span><span>Health</span><span>Markets</span>
        </div>
      </div>
    ),
    size,
  );
}

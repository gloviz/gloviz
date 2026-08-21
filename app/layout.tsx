import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GLOVIZ',
  description:
    'A live open-data observatory: economy, energy, climate, environment, health and transport for 190+ countries.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

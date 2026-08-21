import type { MetadataRoute } from 'next';

const BASE = 'https://gloviz.app';
const PAGES = [
  '', '/economy', '/energy', '/climate', '/environment', '/health', '/finance',
  '/markets', '/nature', '/transport', '/compare', '/stories',
  '/stories/heat-and-power', '/stories/the-pandemic-dip', '/stories/quake-week',
  '/stories/the-heat-right-now', '/stories/the-ground-is-moving',
  '/stories/what-you-are-breathing', '/stories/how-clean-is-the-power',
  '/stories/everything-in-the-air',
  '/explore', '/race', '/surprise', '/markets', '/nature', '/transport',
  '/status',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/status' ? 'hourly' : 'daily',
    priority: path === '' ? 1 : 0.7,
  }));
}

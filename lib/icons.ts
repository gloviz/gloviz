// Inline lucide-style icons and spark lines, extracted from the design reference.
export const ICONS: Record<string, string> = {
  "arrow": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/></svg>",
  "zap": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13 2 3 14h9l-1 8 10-12h-9l1-8z\"/></svg>",
  "anomaly": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m21 21-4.3-4.3\"/><circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"M11 8v3l2 2\"/></svg>",
  "forecast": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 3v18h18\"/><path d=\"m7 15 4-6 4 3 5-8\"/></svg>",
  "correlations": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"7\" cy=\"7\" r=\"4\"/><circle cx=\"17\" cy=\"17\" r=\"4\"/><path d=\"m10 10 4 4\"/></svg>",
  "summary": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 3v18h18\"/><rect x=\"7\" y=\"9\" width=\"3\" height=\"8\"/><rect x=\"13\" y=\"5\" width=\"3\" height=\"12\"/></svg>",
  "ai": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1\"/></svg>",
  "economy": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M22 7l-8.5 8.5-5-5L2 17\"/><path d=\"M16 7h6v6\"/></svg>",
  "climate": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z\"/></svg>",
  "environment": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 20c1.25-.99 2.27-1.98 3.9-1.98 3.14 0 3.14 1.95 6.28 1.95 3.15 0 3.15-1.95 6.29-1.95 1.63 0 2.65.99 3.9 1.98\"/><path d=\"M2 14c1.25-.99 2.27-1.98 3.9-1.98 3.14 0 3.14 1.95 6.28 1.95 3.15 0 3.15-1.95 6.29-1.95 1.63 0 2.65.99 3.9 1.98\"/><path d=\"M2 8c1.25-.99 2.27-1.98 3.9-1.98 3.14 0 3.14 1.95 6.28 1.95C15.33 7.97 15.33 6 18.47 6c1.63 0 2.65.99 3.9 1.98\"/></svg>",
  "health": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z\"/></svg>",
  "finance": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 2v20\"/><path d=\"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"/></svg>",
  "info": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4\"/><path d=\"M12 8h.01\"/></svg>"
};

export const SPARKS: Record<string, string> = {
  "economy": "<svg class=\"spark\" viewBox=\"0 0 220 44\"><path d=\"M0,34 C25,32 40,26 60,27 S100,18 125,20 S180,10 220,6\" fill=\"none\" stroke=\"var(--s1)\" stroke-width=\"2\"/></svg>",
  "energy": "<svg class=\"spark\" viewBox=\"0 0 220 44\"><path d=\"M0,22 C15,20 25,30 40,28 S70,8 90,12 S120,36 145,32 S190,14 220,18\" fill=\"none\" stroke=\"var(--s2)\" stroke-width=\"2\"/></svg>",
  "climate": "<svg class=\"spark\" viewBox=\"0 0 220 44\"><path d=\"M0,30 C20,26 35,14 55,16 S95,34 115,30 S155,12 175,14 S205,24 220,22\" fill=\"none\" stroke=\"var(--s3)\" stroke-width=\"2\"/></svg>",
  "environment": "<svg class=\"spark\" viewBox=\"0 0 220 44\"><path d=\"M0,24 L30,24 40,10 50,38 60,24 120,24 130,16 140,32 150,24 220,24\" fill=\"none\" stroke=\"var(--s4)\" stroke-width=\"2\"/></svg>",
  "health": "<svg class=\"spark\" viewBox=\"0 0 220 44\"><path d=\"M0,36 C30,34 50,30 75,28 S130,20 160,15 S200,8 220,6\" fill=\"none\" stroke=\"var(--s5)\" stroke-width=\"2\"/></svg>",
  "finance": "<svg class=\"spark\" viewBox=\"0 0 220 44\"><path d=\"M0,20 C20,22 40,16 60,18 S100,26 125,22 S170,12 195,16 S210,20 220,18\" fill=\"none\" stroke=\"var(--s6)\" stroke-width=\"2\"/></svg>"
};

'use client';

import { useEffect, useState } from 'react';

const THEMES = ['dyphav', 'kullhav', 'midnatt'] as const;

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>('dyphav');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return (
    <div className="themesw" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

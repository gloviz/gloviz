'use client';

import { useEffect, useState } from 'react';

/** Light = Vinterhav, Dark = Dyphav (default). Kullhav and Midnatt remain in
 *  the CSS as alternates per docs/00-decisions.md item 9. */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>('dyphav');
  useEffect(() => {
    const saved = localStorage.getItem('gloviz-theme');
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gloviz-theme', theme);
    window.dispatchEvent(new CustomEvent('gloviz:theme'));
  }, [theme]);
  return (
    <div className="themesw" role="group" aria-label="Theme">
      <button aria-pressed={theme === 'vinterhav'} onClick={() => setTheme('vinterhav')}>Light</button>
      <button aria-pressed={theme === 'dyphav'} onClick={() => setTheme('dyphav')}>Dark</button>
    </div>
  );
}

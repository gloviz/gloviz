'use client';

import { useEffect, useState } from 'react';

const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

/** Light = Vinterhav, Dark = Dyphav (default), per docs/00-decisions.md item 9. */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useState('dyphav');
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
      <button
        aria-pressed={theme === 'vinterhav'} aria-label="Light theme" title="Light"
        onClick={() => setTheme('vinterhav')} dangerouslySetInnerHTML={{ __html: SUN }}
      />
      <button
        aria-pressed={theme === 'dyphav'} aria-label="Dark theme" title="Dark"
        onClick={() => setTheme('dyphav')} dangerouslySetInnerHTML={{ __html: MOON }}
      />
    </div>
  );
}

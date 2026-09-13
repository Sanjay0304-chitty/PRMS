import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeSwitcher.css';

const MODES = [
  { id: 'light', icon: Sun, label: 'Light mode' },
  { id: 'dark', icon: Moon, label: 'Dark mode' },
];

export default function ThemeSwitcher() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('appearance') || 'light';
  });

  function applyTheme(selected) {
    const html = document.documentElement;
    if (selected === 'light') {
      html.setAttribute('data-theme', 'light');
    } else if (selected === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.setAttribute('data-theme', 'light');
    }
  }

  useEffect(() => {
    localStorage.setItem('appearance', mode);
    applyTheme(mode);
  }, [mode]);

  return (
    <div className="theme-switcher" title="Theme preference">
      {MODES.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            className={`theme-switcher-btn ${isActive ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
            title={m.label}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
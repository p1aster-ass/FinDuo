import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1A1A1D' : '#F5F5F5')
    try { localStorage.setItem('finduo-theme', theme) } catch { /* Storage may be unavailable. */ }
  }, [theme])
  return (
    <button className="theme-toggle" type="button" role="switch" aria-checked={theme === 'light'} aria-label="Light mode" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <span className="theme-toggle-thumb" /><Icon name="moon" /><Icon name="sun" />
    </button>
  )
}

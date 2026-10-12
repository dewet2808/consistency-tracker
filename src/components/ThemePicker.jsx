import { useState, useRef, useEffect } from 'react'
import { Palette, Moon, Sun } from 'lucide-react'
import './ThemePicker.css'

const COLORS = [
  { id: 'blue',   label: 'Blue',   swatch: '#60a5fa' },
  { id: 'pink',   label: 'Pink',   swatch: '#f472b6' },
  { id: 'green',  label: 'Green',  swatch: '#34d399' },
  { id: 'yellow', label: 'Yellow', swatch: '#fbbf24' },
  { id: 'purple', label: 'Purple', swatch: '#a78bfa' },
]

export default function ThemePicker({ theme, color, onToggleTheme, onSetColor }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="tp-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen(v => !v)} title="Customise theme">
        <Palette size={17} />
      </button>

      {open && (
        <div className="tp-popover">
          <div className="tp-label">Mode</div>
          <div className="tp-mode-row">
            <button
              className={`tp-mode-btn${theme === 'dark' ? ' active' : ''}`}
              onClick={() => { if (theme !== 'dark') onToggleTheme() }}
            >
              <Moon size={13} /> Dark
            </button>
            <button
              className={`tp-mode-btn${theme === 'light' ? ' active' : ''}`}
              onClick={() => { if (theme !== 'light') onToggleTheme() }}
            >
              <Sun size={13} /> Light
            </button>
          </div>

          <div className="tp-label">Colour</div>
          <div className="tp-swatches">
            {COLORS.map(c => (
              <button
                key={c.id}
                className={`tp-swatch${color === c.id ? ' active' : ''}`}
                style={{ background: c.swatch }}
                onClick={() => onSetColor(c.id)}
                title={c.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

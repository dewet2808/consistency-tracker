import { useState, useEffect, useRef } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import {
  scheduleReminders,
  cancelReminders,
  loadReminderPrefs,
  saveReminderPrefs,
} from '../notifications'
import { isNativeIOS } from '../purchases'
import './ReminderSettings.css'

export default function ReminderSettings() {
  const [open, setOpen]               = useState(false)
  const [enabled, setEnabled]         = useState(false)
  const [time, setTime]               = useState('08:00')
  const [streakEnabled, setStreak]    = useState(false)
  const [streakTime, setStreakTime]   = useState('21:00')
  const [saved, setSaved]             = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const { enabled: e, time: t, streakEnabled: se, streakTime: st } = loadReminderPrefs()
    setEnabled(e); setTime(t); setStreak(se); setStreakTime(st)
  }, [])

  useEffect(() => {
    function onOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  function handleSave() {
    // Save to localStorage immediately — never blocks UI
    saveReminderPrefs(enabled, time, streakEnabled, streakTime)
    setSaved(true)
    setTimeout(() => { setSaved(false); setOpen(false) }, 800)

    // Schedule notifications in background — fire and forget
    const [dh, dm] = time.split(':').map(Number)
    const [sh, sm] = streakTime.split(':').map(Number)
    scheduleInBackground(enabled, streakEnabled, dh, dm, sh, sm)
  }

  function scheduleInBackground(en, se, dh, dm, sh, sm) {
    if (en || se) {
      scheduleReminders({ dailyEnabled: en, dailyHour: dh, dailyMinute: dm, streakEnabled: se, streakHour: sh, streakMinute: sm })
    } else {
      cancelReminders()
    }
  }

  const isNative  = isNativeIOS()
  const anyActive = enabled || streakEnabled

  return (
    <div className="reminder-wrap" ref={panelRef}>
      <button
        className={`icon-btn${anyActive ? ' reminder-active' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Reminders"
      >
        {anyActive ? <Bell size={17} /> : <BellOff size={17} />}
      </button>

      {open && (
        <div className="reminder-panel">
          <div className="reminder-panel-header">
            <span className="reminder-panel-title">Reminders</span>
            <button className="icon-btn" onClick={() => setOpen(false)}><X size={14} /></button>
          </div>

          {!isNative && (
            <p className="reminder-web-note">
              Reminders only work on the iOS app.
            </p>
          )}

          <div className="reminder-section-label">Morning check-in</div>
          <label className="reminder-toggle-row">
            <span>Enable</span>
            <button
              className={`toggle-btn${enabled ? ' on' : ''}`}
              onClick={() => setEnabled(v => !v)}
              disabled={!isNative}
            >
              <div className="toggle-thumb" />
            </button>
          </label>
          {enabled && (
            <label className="reminder-time-row">
              <span>Remind me at</span>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} disabled={!isNative} />
            </label>
          )}

          <div className="reminder-divider" />

          <div className="reminder-section-label">Streak at risk</div>
          <p className="reminder-section-desc">Fires in the evening if you haven't finished your habits yet.</p>
          <label className="reminder-toggle-row">
            <span>Enable</span>
            <button
              className={`toggle-btn${streakEnabled ? ' on' : ''}`}
              onClick={() => setStreak(v => !v)}
              disabled={!isNative}
            >
              <div className="toggle-thumb" />
            </button>
          </label>
          {streakEnabled && (
            <label className="reminder-time-row">
              <span>Remind me at</span>
              <input type="time" value={streakTime} onChange={e => setStreakTime(e.target.value)} disabled={!isNative} />
            </label>
          )}

          <button
            className="btn-primary reminder-save"
            onClick={handleSave}
            disabled={!isNative}
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

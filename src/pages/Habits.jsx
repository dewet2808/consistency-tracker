import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Trash2, Flame, ChevronLeft, ChevronRight, Pencil, Check, X, Calendar } from 'lucide-react'
import SmallRing from '../components/SmallRing'
import './Habits.css'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getLongestStreak(dateSet) {
  if (!dateSet.size) return 0
  const sorted = [...dateSet].sort()
  let longest = 1, current = 1
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1] + 'T00:00:00')
    const b = new Date(sorted[i]     + 'T00:00:00')
    if ((b - a) / 86400000 === 1) {
      current++
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }
  return longest
}

function buildMonthCells(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const cells = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  return cells
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Year grid ─────────────────────────────────────────────────────────────────

function YearGrid({ store }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const todayStr = toDateStr(new Date())
  const scrollRef = useRef(null)

  const countMap = useMemo(() => {
    const map = new Map()
    store.completions.forEach(c => {
      if (c.date.startsWith(year)) map.set(c.date, (map.get(c.date) ?? 0) + 1)
    })
    return map
  }, [store.completions, year])

  const habitTotal = store.habits.length

  const { weeks, monthLabels } = useMemo(() => {
    const jan1  = new Date(year, 0, 1)
    const dec31 = new Date(year, 11, 31)
    const start = new Date(jan1);  start.setDate(start.getDate() - jan1.getDay())
    const end   = new Date(dec31); end.setDate(end.getDate() + (6 - dec31.getDay()))

    const weeks = []; const monthLabels = []; let wi = 0; let lastMonth = -1
    const cur = new Date(start)
    while (cur <= end) {
      const week = []
      for (let d = 0; d < 7; d++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
      week.forEach(day => {
        if (day.getDate() === 1 && day.getMonth() !== lastMonth && day.getFullYear() === year) {
          monthLabels.push({ wi, label: MONTH_SHORT[day.getMonth()] })
          lastMonth = day.getMonth()
        }
      })
      weeks.push(week); wi++
    }
    return { weeks, monthLabels }
  }, [year])

  // Scroll so current month is visible on the right
  useEffect(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    const today = new Date()
    if (year !== today.getFullYear()) {
      el.scrollLeft = el.scrollWidth
      return
    }
    const currentMonthLabel = monthLabels.find(m => m.label === MONTH_SHORT[today.getMonth()])
    if (!currentMonthLabel) return
    const cellW = 11 + 2 // cell width + gap
    const scrollTarget = currentMonthLabel.wi * cellW - (el.clientWidth - 6 * cellW)
    el.scrollLeft = Math.max(0, scrollTarget)
  }, [year, monthLabels])

  return (
    <div className="card no-hover year-grid-card">
      <div className="year-grid-header">
        <span className="year-grid-title">Year at a glance</span>
        <div className="year-grid-nav">
          <button className="icon-btn" style={{ padding: 4 }} onClick={() => setYear(y => y - 1)}>
            <ChevronLeft size={14} />
          </button>
          <span className="year-grid-year">{year}</span>
          <button className="icon-btn" style={{ padding: 4 }} onClick={() => setYear(y => y + 1)} disabled={year >= currentYear}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="year-grid-scroll" ref={scrollRef}>
        <div className="year-month-labels" style={{ '--week-count': weeks.length }}>
          {monthLabels.map(({ wi, label }) => (
            <span key={label} className="year-month-label" style={{ '--wi': wi }}>{label}</span>
          ))}
        </div>
        <div className="year-grid">
          {weeks.map((week, wi) => (
            <div key={wi} className="year-week">
              {week.map((day, di) => {
                const ds        = toDateStr(day)
                const inYear    = day.getFullYear() === year
                const isFuture  = ds > todayStr
                const isToday   = ds === todayStr
                const done      = inYear && !isFuture ? (countMap.get(ds) ?? 0) : 0
                const pct       = habitTotal > 0 ? done / habitTotal : 0
                const fill      = !inYear || isFuture ? 7 : done === 0 ? 10 : Math.round(10 + pct * 90)
                return (
                  <div
                    key={di}
                    className={`year-cell${isToday ? ' today' : ''}${!inYear ? ' ghost' : ''}`}
                    style={{ '--fill': `${fill}%` }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────

function HabitsSummary({ store, last7 }) {
  const todayDone = store.habits.filter(h => store.isCompleted(h.id)).length
  const total     = store.habits.length
  const pct       = total ? Math.round((todayDone / total) * 100) : 0

  const bestStreak = Math.max(0, ...store.habits.map(h => store.getStreak(h.id)))

  const done7 = store.completions.filter(c => last7.includes(c.date)).length
  const rate7  = total ? Math.round((done7 / (total * 7)) * 100) : 0

  const statusText = todayDone === total && total > 0
    ? 'All routines done!'
    : todayDone === 0
    ? "Let's get started"
    : `${total - todayDone} routine${total - todayDone > 1 ? 's' : ''} left today`

  return (
    <div className="card no-hover habits-summary">
      <SmallRing pct={pct} done={todayDone} total={total} />
      <div className="habits-summary-content">
        <div className="habits-summary-title">Today's routines</div>
        <div className="habits-summary-status">{statusText}</div>
        <div className="habits-summary-chips">
          {bestStreak > 0 && <span className="stat-chip"><Flame size={11} /> {bestStreak}-day best</span>}
          <span className="stat-chip"><Calendar size={11} /> {rate7}% last 7 days</span>
        </div>
      </div>
    </div>
  )
}

// ── Habit detail ──────────────────────────────────────────────────────────────

function HabitDetail({ habitId, store, onBack, onDelete }) {
  const habit = store.habits.find(h => h.id === habitId)
  const [editingName, setEditingName]   = useState(false)
  const [nameVal, setNameVal]           = useState(habit?.name ?? '')
  const [editingFreq, setEditingFreq]   = useState(false)
  const [freqVal, setFreqVal]           = useState(habit?.target_days ?? 7)

  const todayStr = toDateStr(new Date())

  const dateSet = useMemo(() =>
    new Set(store.completions.filter(c => c.habit_id === habitId).map(c => c.date)),
    [store.completions, habitId]
  )

  const currentStreak = store.getStreak(habitId)
  const longestStreak = getLongestStreak(dateSet)
  const totalDone     = dateSet.size

  const last30Days = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return toDateStr(d)
  }), [])
  const rate30 = Math.round((last30Days.filter(d => dateSet.has(d)).length / 30) * 100)

  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - i))
    return { year: d.getFullYear(), month: d.getMonth() }
  }), [])

  if (!habit) return null

  async function saveEdit() {
    const trimmed = nameVal.trim()
    if (!trimmed) { setEditingName(false); setNameVal(habit.name); return }
    if (trimmed !== habit.name) await store.updateHabit(habitId, { name: trimmed })
    setEditingName(false)
  }

  async function saveFreq(days) {
    setFreqVal(days)
    setEditingFreq(false)
    await store.updateHabit(habitId, {
      frequency: days === 7 ? 'daily' : 'weekly',
      target_days: days,
    })
  }

  function startEdit() {
    setNameVal(habit.name)
    setEditingName(true)
  }

  function cancelEdit() {
    setNameVal(habit.name)
    setEditingName(false)
  }

  return (
    <div className="habit-detail">
      <div className="habit-detail-header">
        <button className="icon-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>

        {editingName ? (
          <input
            className="habit-detail-name-input"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
            autoFocus
          />
        ) : (
          <h2 className="habit-detail-name">{habit.name}</h2>
        )}

        <div className="habit-detail-actions">
          {editingName ? (
            <>
              <button className="icon-btn" onClick={saveEdit}><Check size={16} /></button>
              <button className="icon-btn" onClick={cancelEdit}><X size={16} /></button>
            </>
          ) : (
            <>
              <button className="icon-btn" onClick={startEdit}><Pencil size={15} /></button>
              <button className="btn-danger" style={{ opacity: 1 }} onClick={onDelete}>
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="habit-stats-grid">
        <div className="card habit-stat no-hover">
          <div className="habit-stat-value">{currentStreak}</div>
          <div className="habit-stat-label">Current streak</div>
        </div>
        <div className="card habit-stat no-hover">
          <div className="habit-stat-value">{longestStreak}</div>
          <div className="habit-stat-label">Longest streak</div>
        </div>
        <div className="card habit-stat no-hover">
          <div className="habit-stat-value">{totalDone}</div>
          <div className="habit-stat-label">Total done</div>
        </div>
        <div className="card habit-stat no-hover">
          <div className="habit-stat-value">{rate30}%</div>
          <div className="habit-stat-label">Last 30 days</div>
        </div>
      </div>

      {/* Frequency editor */}
      <div className="card no-hover habit-freq-card">
        <div className="habit-freq-row">
          <div>
            <div className="habit-freq-label">Target frequency</div>
            <div className="habit-freq-value">
              {freqVal === 7 ? 'Daily' : `${freqVal}× per week`}
            </div>
          </div>
          <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setEditingFreq(v => !v)}>
            {editingFreq ? 'Cancel' : 'Change'}
          </button>
        </div>
        {editingFreq && (
          <div className="freq-picker" style={{ marginTop: 12 }}>
            {FREQ_OPTS.map(o => (
              <button
                key={o.days}
                type="button"
                className={`freq-btn${freqVal === o.days ? ' active' : ''}`}
                onClick={() => saveFreq(o.days)}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="habit-cal-months">
        {months.slice().reverse().map(({ year, month }) => {
          const cells = buildMonthCells(year, month)
          return (
            <div key={`${year}-${month}`} className="card no-hover habit-month">
              <div className="habit-month-title">{MONTH_NAMES[month]} {year}</div>
              <div className="habit-day-headers">
                {DAY_HEADERS.map(d => <div key={d} className="habit-day-header">{d}</div>)}
              </div>
              <div className="habit-month-grid">
                {cells.map((date, i) => {
                  if (!date) return <div key={`e${i}`} className="habit-day-cell empty" />
                  const ds      = toDateStr(date)
                  const done    = dateSet.has(ds)
                  const future  = ds > todayStr
                  const isToday = ds === todayStr
                  return (
                    <div key={ds} className={`habit-day-cell${done ? ' done' : ''}${future ? ' future' : ''}${isToday ? ' today' : ''}`}>
                      {date.getDate()}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Habits list ───────────────────────────────────────────────────────────────

const FREQ_OPTS = [
  { label: 'Daily',      days: 7 },
  { label: '2× / week',  days: 2 },
  { label: '3× / week',  days: 3 },
  { label: '4× / week',  days: 4 },
  { label: '5× / week',  days: 5 },
  { label: '6× / week',  days: 6 },
]

export default function Habits({ store, onToast, isPro = true, onShowPaywall }) {
  const [showForm, setShowForm]               = useState(false)
  const [name, setName]                       = useState('')
  const [targetDays, setTargetDays]           = useState(7)
  const [saving, setSaving]                   = useState(false)
  const [selectedHabitId, setSelectedHabitId] = useState(null)

  const last7 = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); return toDateStr(d)
    }), [])

  const last30 = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); return toDateStr(d)
    }), [])

  const habitDateMap = useMemo(() => {
    const map = new Map()
    store.habits.forEach(h => map.set(h.id, new Set()))
    store.completions.forEach(c => {
      if (map.has(c.habit_id)) map.get(c.habit_id).add(c.date)
    })
    return map
  }, [store.habits, store.completions])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error } = await store.addHabit({
      name: name.trim(),
      frequency: targetDays === 7 ? 'daily' : 'weekly',
      target_days: targetDays,
    })
    setSaving(false)
    if (error) { onToast('Failed to add routine'); return }
    setName(''); setTargetDays(7); setShowForm(false)
    onToast('Routine added!')
  }

  async function handleDelete(id, habitName) {
    if (!confirm(`Delete "${habitName}"? All completion history will be lost.`)) return
    const { error } = await store.deleteHabit(id)
    if (error) onToast('Failed to delete')
    else { onToast('Routine deleted'); setSelectedHabitId(null) }
  }

  if (selectedHabitId) {
    const habit = store.habits.find(h => h.id === selectedHabitId)
    return (
      <HabitDetail
        habitId={selectedHabitId}
        store={store}
        onBack={() => setSelectedHabitId(null)}
        onDelete={() => handleDelete(selectedHabitId, habit?.name ?? '')}
      />
    )
  }

  return (
    <div className="habits-page">
      <div className="page-header">
        <h2 className="page-title">Routines</h2>
        <button className="btn-primary" onClick={() => {
          if (!isPro && store.habits.length >= 3) { onShowPaywall?.(); return }
          setShowForm(v => !v)
        }}>
          <Plus size={15} /> New Routine
        </button>
      </div>

      {store.habits.length > 0 && (
        <HabitsSummary store={store} last7={last7} />
      )}

      {store.habits.length > 0 && (
        <YearGrid store={store} />
      )}

      {showForm && (
        <form className="card habit-form no-hover" onSubmit={handleAdd}>
          <div className="form-group">
            <label>Routine name</label>
            <input
              autoFocus
              placeholder="e.g. Read for 20 minutes"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>How often?</label>
            <div className="freq-picker">
              {FREQ_OPTS.map(o => (
                <button
                  key={o.days}
                  type="button"
                  className={`freq-btn${targetDays === o.days ? ' active' : ''}`}
                  onClick={() => setTargetDays(o.days)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="habit-form-actions">
            <button type="button" className="btn-ghost" onClick={() => { setShowForm(false); setTargetDays(7) }}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Add Habit'}
            </button>
          </div>
        </form>
      )}

      {store.habits.length === 0 ? (
        <div className="habits-empty">
          <Flame size={28} className="habits-empty-icon" />
          <div className="habits-empty-text">No routines yet</div>
          <div className="habits-empty-sub">Add your first routine to start building consistent behaviour.</div>
        </div>
      ) : (
        <div className="habit-cards">
          {store.habits.map(habit => {
            const streak    = store.getStreak(habit.id)
            const dates     = habitDateMap.get(habit.id) ?? new Set()
            const totalDone = dates.size
            const rate30    = Math.round((last30.filter(d => dates.has(d)).length / 30) * 100)
            const doneToday = store.isCompleted(habit.id)

            return (
              <div
                key={habit.id}
                className={`card habit-card${doneToday ? ' done-today' : ''}`}
                onClick={() => setSelectedHabitId(habit.id)}
              >
                <div className="habit-card-main">
                  <div className="habit-card-info">
                    <div className="habit-card-name">{habit.name}</div>
                    <div className="habit-card-meta">
                      {habit.target_days > 0 && habit.target_days < 7
                        ? <span className="badge badge-muted">{habit.target_days}× / week</span>
                        : streak > 0 && (
                            <span className="badge badge-accent">
                              <Flame size={10} /> {streak}-day streak
                            </span>
                          )
                      }
                      <span className="habit-card-total">{totalDone} done · {rate30}% last 30d</span>
                    </div>
                    <div className="habit-dots">
                      {last7.map((date, i) => (
                        <span key={i} className={`habit-dot${dates.has(date) ? ' done' : ''}`} />
                      ))}
                    </div>
                  </div>
                  <ChevronLeft size={16} className="habit-card-chevron" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState, useMemo, useRef, useEffect } from 'react'
import { Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil, Target } from 'lucide-react'
import Confetti from '../components/Confetti'
import WeeklyReview from '../components/WeeklyReview'
import './Today.css'

function DailyIntention({ dateStr }) {
  const key = `daily_intention_${dateStr}`
  const [value, setValue]     = useState(() => localStorage.getItem(key) ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const inputRef              = useRef(null)

  function startEdit() {
    setDraft(value)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function save() {
    const trimmed = draft.trim()
    setValue(trimmed)
    localStorage.setItem(key, trimmed)
    setEditing(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <div className="intention-edit">
        <input
          ref={inputRef}
          className="intention-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={save}
          placeholder="What's your main focus today?"
          maxLength={120}
        />
      </div>
    )
  }

  if (value) {
    return (
      <div className="intention-set" onClick={startEdit}>
        <span className="intention-label">Today's intention</span>
        <span className="intention-text">{value}</span>
        <Pencil size={12} className="intention-edit-icon" />
      </div>
    )
  }

  return (
    <button className="intention-prompt" onClick={startEdit}>
      <Target size={14} className="intention-prompt-icon" />
      <span>Set your intention for today</span>
    </button>
  )
}

const MAX_BACK_DAYS = 7

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function toLocalDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function RingProgress({ pct, done, total }) {
  const size   = 148
  const stroke = 11
  const radius = (size - stroke) / 2
  const circ   = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ

  return (
    <div className="ring-outer">
    <div className="ring-wrap">
      <svg width={size} height={size} className="ring-svg">
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--surface3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--accent)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="ring-inner">
        <div className="ring-pct">{pct}%</div>
        <div className="ring-sub">{done} of {total}</div>
      </div>
    </div>
    <div className="ring-label">Habits & tasks</div>
    </div>
  )
}

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function Today({ store }) {
  const [showDetails, setShowDetails]   = useState(false)
  const [viewOffset, setViewOffset]     = useState(0) // 0 = today, -1 = yesterday, …
  const [confettiKey, setConfettiKey]   = useState(0)
  const wasAllDone                      = useRef(null) // null = not yet initialised

  const todayDate = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  const viewDate = useMemo(() => {
    const d = new Date(todayDate)
    d.setDate(d.getDate() + viewOffset)
    return d
  }, [todayDate, viewOffset])

  const viewDateStr    = useMemo(() => toLocalDateStr(viewDate), [viewDate])
  const isViewingToday = viewOffset === 0

  function goBack() {
    setViewOffset(o => Math.max(-MAX_BACK_DAYS, o - 1))
    setShowDetails(false)
  }
  function goForward() {
    setViewOffset(o => Math.min(0, o + 1))
    setShowDetails(false)
  }

  const dateLabel = isViewingToday
    ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const viewHabits = store.habits
  const viewTasks  = store.getTasksForDate(viewDateStr)

  const isWeeklyHabit = h => h.target_days > 0 && h.target_days < 7

  const doneHabits  = viewHabits.filter(h => {
    if (isViewingToday && isWeeklyHabit(h)) {
      return store.getWeeklyCount(h.id) >= h.target_days
    }
    return store.isCompleted(h.id, viewDateStr)
  })
  const doneTasks   = viewTasks.filter(t => store.isTaskDone(t.id, viewDateStr))
  const totalItems  = viewHabits.length + viewTasks.length
  const doneItems   = doneHabits.length + doneTasks.length
  const pct         = totalItems ? Math.round((doneItems / totalItems) * 100) : 0
  const allDone     = totalItems > 0 && doneItems === totalItems

  // Fire confetti once when the last item is ticked off today
  useEffect(() => {
    if (store.loadingData) return
    if (wasAllDone.current === false && allDone && isViewingToday) {
      setConfettiKey(k => k + 1)
    }
    wasAllDone.current = allDone && isViewingToday
  }, [allDone, isViewingToday, store.loadingData])

  // Week strip — always shows 7 days relative to today
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      d.setHours(0, 0, 0, 0)
      const dateStr  = toLocalDateStr(d)
      const isToday  = i === 6
      const isViewing = dateStr === viewDateStr
      const dayLabel = WEEK_DAYS[d.getDay()]
      if (!store.habits.length) return { dateStr, dayLabel, isToday, isViewing, pct: 0 }
      const done = store.completions.filter(c => c.date === dateStr).length
      const pct  = done / store.habits.length
      return { dateStr, dayLabel, isToday, isViewing, pct }
    })
  }, [store.habits, store.completions, viewDateStr])

  const showList = !allDone || showDetails

  return (
    <div className="today-page">
      {confettiKey > 0 && <Confetti trigger={confettiKey} />}

      {/* Header: greeting + date nav */}
      <div className="today-greeting">
        {isViewingToday && (
          <div className="today-greeting-row">
            <div className="today-greeting-text">{getGreeting()}</div>
            <WeeklyReview store={store} />
          </div>
        )}
        <div className="today-date-row">
          <button
            className="icon-btn date-nav-btn"
            onClick={goBack}
            disabled={viewOffset <= -MAX_BACK_DAYS}
            title="Previous day"
          >
            <ChevronLeft size={16} />
          </button>
          <div className={`today-date${!isViewingToday ? ' past' : ''}`}>{dateLabel}</div>
          {!isViewingToday ? (
            <button className="icon-btn date-nav-btn" onClick={goForward} title="Next day">
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="date-nav-spacer" />
          )}
        </div>
        {!isViewingToday && (
          <button className="back-to-today-btn" onClick={() => { setViewOffset(0); setShowDetails(false) }}>
            Back to today →
          </button>
        )}
      </div>

      {/* Daily intention — today only */}
      {isViewingToday && <DailyIntention dateStr={viewDateStr} />}

      {/* Ring */}
      {totalItems > 0 && (
        <div className="today-ring-section">
          <RingProgress pct={pct} done={doneItems} total={totalItems} />
        </div>
      )}

      {/* Week strip */}
      {store.habits.length > 0 && (
        <div className="card no-hover week-strip-card">
          <div className="week-strip-label">This week</div>
          <div className="week-strip">
            {weekDays.map(({ dateStr, dayLabel, isToday, isViewing, pct: dayPct }) => (
              <div
                key={dateStr}
                className="week-day"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const offset = weekDays.findIndex(w => w.dateStr === dateStr) - 6
                  setViewOffset(offset)
                  setShowDetails(false)
                }}
              >
                <div
                  className={`week-dot${isToday ? ' today' : ''}${isViewing && !isToday ? ' viewing' : ''}`}
                  style={{
                    '--dot-fill':   dayPct >= 1 ? '100%' : `${Math.round((0.12 + dayPct * 0.53) * 100)}%`,
                    '--dot-stroke': dayPct >= 1 ? '100%' : `${Math.round((0.25 + dayPct * 0.60) * 100)}%`,
                  }}
                />
                <div className={`week-day-label${isToday ? ' today' : ''}${isViewing && !isToday ? ' viewing' : ''}`}>{dayLabel}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All-done state */}
      {allDone && (
        <div className="all-done-card card no-hover">
          <div className="all-done-icon">
            <Check size={22} strokeWidth={2.5} />
          </div>
          <div className="all-done-text">
            {isViewingToday ? 'All done for today' : 'All done for this day'}
          </div>
          <div className="all-done-sub">
            {isViewingToday ? 'Great work — come back tomorrow.' : 'Nice — everything was completed.'}
          </div>
          <button
            className="all-done-toggle"
            onClick={() => setShowDetails(v => !v)}
          >
            {showDetails ? <><ChevronUp size={14} /> Hide details</> : <><ChevronDown size={14} /> Review</>}
          </button>
        </div>
      )}

      {/* Habits */}
      {showList && viewHabits.length > 0 && (
        <div className="today-section">
          <div className="today-section-header">
            <span className="today-section-title">Habits</span>
            <span className="today-progress-pct">{doneHabits.length}/{viewHabits.length}</span>
          </div>
          <div className="habit-list">
            {viewHabits.map(habit => {
              const weekly    = isViewingToday && isWeeklyHabit(habit)
              const weekCount = weekly ? store.getWeeklyCount(habit.id) : 0
              const weekDone  = weekly && weekCount >= habit.target_days
              const done      = weekDone || store.isCompleted(habit.id, viewDateStr)
              const streak    = store.getStreak(habit.id)
              return (
                <button
                  key={habit.id}
                  className={`habit-row card no-hover${done ? ' done' : ''}`}
                  onClick={() => store.toggleHabit(habit.id, viewDateStr)}
                >
                  <div className="habit-check">
                    {done && <Check size={11} strokeWidth={3} />}
                  </div>
                  <div className="habit-info">
                    <div className="habit-name">{habit.name}</div>
                    {weekly
                      ? <div className="habit-streak">{weekCount}/{habit.target_days}× this week</div>
                      : streak > 0 && <div className="habit-streak">{streak}-day streak</div>
                    }
                  </div>
                  {weekly && (
                    <div className="habit-week-badge">{habit.target_days}×/wk</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tasks */}
      {showList && viewTasks.length > 0 && (
        <div className="today-section">
          <div className="today-section-header">
            <span className="today-section-title">Tasks</span>
            <span className="today-progress-pct">{doneTasks.length}/{viewTasks.length}</span>
          </div>
          <div className="habit-list">
            {viewTasks.map(task => {
              const done = store.isTaskDone(task.id, viewDateStr)
              return (
                <button
                  key={task.id}
                  className={`habit-row card no-hover${done ? ' done' : ''}`}
                  onClick={() => store.toggleTask(task.id, viewDateStr)}
                >
                  <div className="habit-check">
                    {done && <Check size={11} strokeWidth={3} />}
                  </div>
                  <div className="habit-info">
                    <div className="habit-name">{task.title}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* To-Do List (today only) */}
      {isViewingToday && store.todos.length > 0 && (
        <div className="today-section">
          <div className="today-section-header">
            <span className="today-section-title">To-Do</span>
            <span className="today-progress-pct">
              {store.todos.filter(t => t.completed).length}/{store.todos.length}
            </span>
          </div>
          <div className="habit-list">
            {store.todos.map(todo => (
              <button
                key={todo.id}
                className={`habit-row card no-hover${todo.completed ? ' done' : ''}`}
                onClick={() => store.toggleTodo(todo.id)}
              >
                <div className="habit-check">
                  {todo.completed && <Check size={11} strokeWidth={3} />}
                </div>
                <div className="habit-info">
                  <div className={`habit-name${todo.completed ? ' todo-strike' : ''}`}>{todo.title}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {totalItems === 0 && (
        <div className="today-empty">
          {viewTasks.length === 0 && viewHabits.length === 0
            ? 'Nothing scheduled — add habits or tasks to get started.'
            : 'Nothing scheduled for this day.'}
        </div>
      )}
    </div>
  )
}

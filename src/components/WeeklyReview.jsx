import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, ClipboardList, CheckSquare, Target } from 'lucide-react'
import './WeeklyReview.css'

function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}

function getLastWeekRange() {
  const today  = new Date()
  const dow    = today.getDay()
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  thisMonday.setHours(0, 0, 0, 0)
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)
  const lastSunday = new Date(thisMonday)
  lastSunday.setDate(thisMonday.getDate() - 1)
  return { start: toDateStr(lastMonday), end: toDateStr(lastSunday) }
}

function getThisWeekRange() {
  const today = new Date()
  const dow   = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: toDateStr(monday), end: toDateStr(sunday) }
}

function StatRow({ icon: Icon, label, value, sub }) {
  return (
    <div className="wr-stat-row">
      <span className="wr-stat-emoji"><Icon size={15} /></span>
      <div className="wr-stat-info">
        <span className="wr-stat-label">{label}</span>
        {sub && <span className="wr-stat-sub">{sub}</span>}
      </div>
      <span className="wr-stat-value">{value}</span>
    </div>
  )
}

export default function WeeklyReview({ store }) {
  const [open, setOpen]       = useState(false)
  const [wentWell, setWentWell]     = useState('')
  const [improve, setImprove]       = useState('')
  const [saved, setSaved]           = useState(false)

  const { start, end } = useMemo(getLastWeekRange, [])
  const thisWeek       = useMemo(getThisWeekRange, [])

  // Use last week if it's Mon–Wed, otherwise show this week's progress
  const useLastWeek = new Date().getDay() <= 3
  const range = useLastWeek ? { start, end } : thisWeek

  const weekDays = useMemo(() => {
    const days = []
    const cursor = new Date(range.start + 'T00:00:00')
    const endDate = new Date(range.end + 'T00:00:00')
    while (cursor <= endDate) {
      days.push(toDateStr(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return days
  }, [range])

  const routineCompletions = store.completions.filter(c => weekDays.includes(c.date)).length
  const totalPossible      = store.habits.length * weekDays.length
  const routineRate        = totalPossible > 0 ? Math.round((routineCompletions / totalPossible) * 100) : 0

  const tasksDone = store.taskCompletions.filter(c => weekDays.includes(c.date)).length

  const goalsProgressed = store.goals.filter(g => g.progress > 0 && !g.completed).length
  const goalsDone       = store.goals.filter(g => g.completed).length

  const scoreLabel =
    routineRate >= 80 ? 'Excellent week' :
    routineRate >= 60 ? 'Solid week' :
    routineRate >= 40 ? 'Room to grow' :
                        'Keep going'

  const storageKey = `weekly_review_${range.start}`

  function handleOpen() {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const { wentWell: ww, improve: im } = JSON.parse(saved)
        setWentWell(ww ?? '')
        setImprove(im ?? '')
      } catch {}
    } else {
      setWentWell('')
      setImprove('')
    }
    setSaved(false)
    setOpen(true)
  }

  function handleSave() {
    localStorage.setItem(storageKey, JSON.stringify({ wentWell, improve }))
    setSaved(true)
    setTimeout(() => setOpen(false), 800)
  }

  const weekLabel = useLastWeek ? 'Last week' : 'This week so far'
  const weekRange = `${new Date(range.start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(range.end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <>
      <button className="wr-trigger-btn" onClick={handleOpen}>
        <ClipboardList size={14} />
        <span>Weekly Review</span>
      </button>

      {open && createPortal(
        <div className="wr-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="wr-sheet">
            <div className="wr-handle" />

            <div className="wr-header">
              <div>
                <div className="wr-title">Weekly Review</div>
                <div className="wr-range">{weekLabel} · {weekRange}</div>
              </div>
              <button className="icon-btn" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>

            {/* Score banner */}
            <div className="wr-score-banner">
              <span className="wr-score-label">{scoreLabel}</span>
              <span className="wr-score-pct">{routineRate}% routines completed</span>
            </div>

            {/* Stats */}
            <div className="wr-stats">
              <StatRow icon={ClipboardList} label="Routines completed" value={`${routineCompletions}/${totalPossible}`} sub={`${routineRate}% completion rate`} />
              <StatRow icon={CheckSquare}  label="Tasks done"         value={tasksDone} />
              {(goalsProgressed + goalsDone) > 0 && (
                <StatRow icon={Target} label="Goals" value={`${goalsDone} done · ${goalsProgressed} active`} />
              )}
            </div>

            <div className="wr-divider" />

            {/* Reflection */}
            <div className="wr-reflection">
              <label className="wr-reflection-label">What went well?</label>
              <textarea
                className="wr-textarea"
                value={wentWell}
                onChange={e => setWentWell(e.target.value)}
                placeholder="Wins, breakthroughs, moments of consistency…"
                rows={3}
              />
              <label className="wr-reflection-label">What will you improve?</label>
              <textarea
                className="wr-textarea"
                value={improve}
                onChange={e => setImprove(e.target.value)}
                placeholder="One thing to focus on next week…"
                rows={3}
              />
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              onClick={handleSave}
            >
              {saved ? '✓ Saved' : 'Save reflection'}
            </button>
          </div>
        </div>
      , document.body)}
    </>
  )
}

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Calendar.css'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getMondayOf(d) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

function getTasksForDate(tasks, date) {
  const dayOfWeek  = date.getDay()
  const dayOfMonth = date.getDate()
  const dateStr    = toDateStr(date)
  const dateMon    = getMondayOf(date)

  return tasks.filter(task => {
    switch (task.recurrence) {
      case 'weekly':
        return task.days?.includes(dayOfWeek)

      case 'biweekly': {
        if (!task.days?.includes(dayOfWeek)) return false
        if (!task.due_date) return false
        const ref = new Date(task.due_date + 'T00:00:00')
        const refMon = getMondayOf(ref)
        const weeksDiff = Math.round((dateMon - refMon) / (7 * 24 * 60 * 60 * 1000))
        return weeksDiff >= 0 && weeksDiff % 2 === 0
      }

      case 'monthly':
        return task.days?.[0] === dayOfMonth

      case 'once':
        return task.due_date === dateStr

      default:
        return false
    }
  })
}

function scheduleTag(task) {
  switch (task.recurrence) {
    case 'weekly':   return 'Weekly'
    case 'biweekly': return 'Bi-weekly'
    case 'monthly':  return 'Monthly'
    case 'once':     return 'One-off'
    default:         return ''
  }
}

export default function Calendar({ store }) {
  const todayDate = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  }, [])
  const todayStr = toDateStr(todayDate)

  const [viewYear,  setViewYear]  = useState(todayDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth())
  const [selectedStr, setSelectedStr] = useState(null)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedStr(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedStr(null)
  }
  function goToday() {
    setViewYear(todayDate.getFullYear())
    setViewMonth(todayDate.getMonth())
    setSelectedStr(todayStr)
  }

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const last  = new Date(viewYear, viewMonth + 1, 0)
    const result = []
    for (let i = 0; i < first.getDay(); i++) result.push(null)
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(viewYear, viewMonth, d)
      date.setHours(0, 0, 0, 0)
      result.push(date)
    }
    return result
  }, [viewYear, viewMonth])

  const taskMap = useMemo(() => {
    const map = new Map()
    cells.forEach(date => {
      if (!date) return
      map.set(toDateStr(date), getTasksForDate(store.tasks, date))
    })
    return map
  }, [cells, store.tasks])

  // Per-day habit completion count
  const habitCountMap = useMemo(() => {
    const map = new Map()
    store.completions.forEach(c => {
      map.set(c.date, (map.get(c.date) ?? 0) + 1)
    })
    return map
  }, [store.completions])

  const habitTotal = store.habits.length

  // Month-level stats
  const monthStats = useMemo(() => {
    const realDays = cells.filter(d => d && toDateStr(d) <= todayStr)
    if (!realDays.length || !habitTotal) return null
    const possible = realDays.length * habitTotal
    const done = realDays.reduce((sum, d) => sum + (habitCountMap.get(toDateStr(d)) ?? 0), 0)
    return Math.round((done / possible) * 100)
  }, [cells, habitCountMap, habitTotal, todayStr])

  const selectedTasks = selectedStr ? (taskMap.get(selectedStr) ?? []) : []
  const selectedDate  = selectedStr ? (() => { const [y,m,d] = selectedStr.split('-').map(Number); return new Date(y, m-1, d) })() : null

  return (
    <div className="calendar-page">
      <div className="page-header">
        <h2 className="page-title">Calendar</h2>
        <button className="btn-ghost" onClick={goToday}>Today</button>
      </div>

      <div className="cal-month-nav">
        <button className="icon-btn" onClick={prevMonth}><ChevronLeft size={18} /></button>
        <div className="cal-month-info">
          <span className="cal-month-label">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          {monthStats !== null && (
            <span className="cal-month-rate">{monthStats}% this month</span>
          )}
        </div>
        <button className="icon-btn" onClick={nextMonth}><ChevronRight size={18} /></button>
      </div>

      <div className="card no-hover cal-card">
        <div className="cal-day-headers">
          {DAY_HEADERS.map(d => <div key={d} className="cal-day-header">{d}</div>)}
        </div>

        <div className="cal-grid">
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} className="cal-cell cal-empty" />
            const ds         = toDateStr(date)
            const taskCount  = taskMap.get(ds)?.length ?? 0
            const habitDone  = habitCountMap.get(ds) ?? 0
            const habitLevel = habitTotal === 0 ? 0 : habitDone === 0 ? 0 : habitDone >= habitTotal ? 2 : 1
            const isToday    = ds === todayStr
            const isSelected = ds === selectedStr
            const isFuture   = ds > todayStr

            const cls = [
              'cal-cell',
              isToday    ? 'cal-today'    : '',
              isSelected ? 'cal-selected' : '',
              isFuture   ? 'cal-future'   : '',
              !isFuture && habitLevel === 1 ? 'habit-partial' : '',
              !isFuture && habitLevel === 2 ? 'habit-full'    : '',
            ].filter(Boolean).join(' ')

            return (
              <div key={ds} className={cls} onClick={() => setSelectedStr(isSelected ? null : ds)}>
                <span className="cal-num">{date.getDate()}</span>
                {taskCount > 0 && (
                  <div className="cal-dots">
                    {Array.from({ length: Math.min(taskCount, 3) }).map((_, k) => (
                      <span key={k} className="cal-dot" />
                    ))}
                    {taskCount > 3 && <span className="cal-overflow">+{taskCount - 3}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {habitTotal > 0 && (
        <div className="cal-legend">
          <span className="cal-legend-item">
            <span className="cal-legend-dot full" /> All habits done
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot partial" /> Partial
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot task" /> Task due
          </span>
        </div>
      )}

      {selectedDate && (
        <div className="cal-detail">
          <div className="cal-detail-heading">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {selectedTasks.length === 0 ? (
            <div className="cal-detail-empty">No tasks scheduled</div>
          ) : (
            <div className="cal-detail-list">
              {selectedTasks.map(task => (
                <div key={task.id} className="card no-hover cal-task-row">
                  <span className="cal-task-name">{task.title}</span>
                  <span className="cal-task-badge">{scheduleTag(task)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

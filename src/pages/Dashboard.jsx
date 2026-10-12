import { useMemo } from 'react'
import { Lock, TrendingUp, TrendingDown, AlertCircle, Star, Flame, Award, Target, CheckCircle, Activity, Brain, Moon, BookOpen, Droplets, Zap } from 'lucide-react'
import { computeInsights } from '../utils/insights'
import './Dashboard.css'

const INSIGHT_ICONS = { TrendingUp, TrendingDown, AlertCircle, Star, Flame, Award, Target, CheckCircle, Activity, Brain, Moon, BookOpen, Droplets }

function InsightsCard({ store }) {
  const insights = useMemo(() => computeInsights(store), [store.completions, store.habits, store.goals])

  if (!insights.length) {
    return (
      <div className="card dash-section no-hover">
        <div className="dash-section-title">Smart Insights</div>
        <div className="dash-empty">Keep going — insights appear after a few days of data.</div>
      </div>
    )
  }

  return (
    <div className="card dash-section no-hover">
      <div className="dash-section-title">Smart Insights</div>
      <div className="insights-list">
        {insights.map(insight => {
          const Icon = INSIGHT_ICONS[insight.icon]
          return (
            <div key={insight.id} className={`insight-row insight-${insight.type}`}>
              <div className="insight-icon">{Icon && <Icon size={15} />}</div>
              <div className="insight-body">
                <div className="insight-text">{insight.text}</div>
                <div className="insight-sub">{insight.sub}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getLast7() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return toDateStr(d)
  })
}

function StatCard({ value, label }) {
  return (
    <div className="card stat-card no-hover">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function ScoreRing({ score }) {
  const r = 36, circ = 2 * Math.PI * r
  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--accent)' : 'var(--yellow, var(--accent))'
  return (
    <div className="score-ring-wrap">
      <svg width={86} height={86}>
        <circle cx={43} cy={43} r={r} fill="none" stroke="var(--surface3)" strokeWidth={8} />
        <circle cx={43} cy={43} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          transform={`rotate(-90 43 43)`}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="score-ring-inner">
        <span className="score-ring-value">{score}</span>
        <span className="score-ring-unit">/ 100</span>
      </div>
    </div>
  )
}

function getCompoundFact(name, projected) {
  const n = name.toLowerCase()
  if (/read|book|pages?/.test(n)) return `~${Math.round(projected / 15)} books at ~15 pages per session`
  if (/run|jog|marathon/.test(n)) return `${projected} runs — aerobic base compounds daily`
  if (/meditat|mindful|breath/.test(n)) return `~${Math.round(projected * 10 / 60)} hours of mental clarity`
  if (/journal|gratitude|reflect/.test(n)) return `${projected} days of self-reflection`
  if (/pushup|press|squat|pullup|sit.?up/.test(n)) return `~${(projected * 50).toLocaleString()} reps at 50 per session`
  if (/gym|workout|exercise|train|lift|weights|hiit/.test(n)) return `${projected} sessions — elite athletes train ~300/year`
  if (/walk|steps/.test(n)) return `${projected} walks — your body will thank you`
  if (/yoga|stretch|mobil/.test(n)) return `${projected} sessions — mobility compounds over years`
  if (/water|hydrat/.test(n)) return `${projected} days of optimal hydration`
  if (/sleep|wind.?down|evening|bedtime/.test(n)) return `${projected} consistent evenings — protecting recovery`
  if (/cold|shower/.test(n)) return `${projected} cold showers — mental fortitude, session by session`
  return null
}

function CompoundEffectCard({ store }) {
  const data = useMemo(() => {
    if (!store.habits.length) return []
    const today = new Date()
    const jan1 = new Date(today.getFullYear(), 0, 1)
    const daysElapsed = Math.max(1, Math.ceil((today - jan1) / 86400000))
    const yearStr = String(today.getFullYear())

    return store.habits
      .map(habit => {
        const doneThisYear = store.completions.filter(
          c => c.habit_id === habit.id && c.date.startsWith(yearStr)
        ).length
        if (doneThisYear === 0) return null
        const projected = Math.round((doneThisYear / daysElapsed) * 365)
        const expectedNow = projected * (daysElapsed / 365)
        const status = doneThisYear >= expectedNow * 1.05 ? 'ahead'
          : doneThisYear >= expectedNow * 0.85 ? 'on track'
          : 'behind'
        const pct = Math.min(100, Math.round((doneThisYear / projected) * 100))
        return { habit, doneThisYear, projected, status, pct, fact: getCompoundFact(habit.name, projected) }
      })
      .filter(Boolean)
      .sort((a, b) => b.projected - a.projected)
      .slice(0, 5)
  }, [store.habits, store.completions])

  if (!data.length) return null

  return (
    <div className="card dash-section no-hover">
      <div className="dash-section-header">
        <div className="dash-section-title">The Compound Effect</div>
        <div className="dash-section-sub">Small daily actions, scaled to a year</div>
      </div>
      <div className="compound-list">
        {data.map(({ habit, doneThisYear, projected, status, pct, fact }) => (
          <div key={habit.id} className="compound-row">
            <div className="compound-row-top">
              <div className="compound-name">{habit.name}</div>
              <div className={`compound-pill compound-pill-${status.replace(' ', '-')}`}>{status}</div>
            </div>
            <div className="compound-pace">
              On pace for <strong>{projected.toLocaleString()}</strong> by Dec 31
            </div>
            <div className="compound-bar-wrap">
              <div className="compound-bar">
                <div className="compound-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="compound-bar-done">{doneThisYear} done · {pct}%</span>
            </div>
            {fact && <div className="compound-fact">{fact}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ store, isPro = false, onShowPaywall }) {
  const todayStr = toDateStr(new Date())
  const days = useMemo(getLast7, [])

  const dayData = days.map(date => {
    if (!store.habits.length) return { date, pct: 0 }
    const done = store.completions.filter(c => c.date === date).length
    return { date, pct: Math.round((done / store.habits.length) * 100) }
  })

  const habitBreakdown = store.habits.map(habit => {
    const doneSet = new Set(
      store.completions.filter(c => c.habit_id === habit.id).map(c => c.date)
    )
    const done7 = days.filter(d => doneSet.has(d)).length
    return { habit, doneSet, rate: Math.round((done7 / 7) * 100) }
  })

  const bestStreak = store.habits.length
    ? Math.max(0, ...store.habits.map(h => store.getStreak(h.id)))
    : 0

  const completionsThisWeek = days.reduce(
    (sum, d) => sum + store.completions.filter(c => c.date === d).length, 0
  )

  const taskCompletionsThisWeek = days.reduce(
    (sum, d) => sum + store.taskCompletions.filter(c => c.date === d).length, 0
  )

  const activeGoals    = store.goals.filter(g => !g.completed)
  const completedGoals = store.goals.filter(g => g.completed)

  // Weekly productivity score
  const routineScore = store.habits.length > 0
    ? Math.round((completionsThisWeek / (store.habits.length * 7)) * 100)
    : null
  const taskScore  = Math.min(100, taskCompletionsThisWeek * 10)
  const weeklyScore = routineScore !== null
    ? Math.round(routineScore * 0.60 + taskScore * 0.40)
    : null

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2 className="page-title">Progress</h2>
      </div>

      {/* Weekly Score */}
      {isPro ? (
        <div className="card no-hover dash-score-card">
          <div className="dash-score-left">
            <div className="dash-score-title">Weekly Score</div>
            <div className="dash-score-sub">Routines · Tasks</div>
            <div className="dash-score-breakdown">
              {routineScore !== null && <span className="dash-score-chip">{routineScore}% routines</span>}
              <span className="dash-score-chip">{taskCompletionsThisWeek} tasks</span>
            </div>
          </div>
          {weeklyScore !== null
            ? <ScoreRing score={weeklyScore} />
            : <div className="dash-score-empty">Add routines to get your score</div>
          }
        </div>
      ) : (
        <button className="card no-hover dash-score-card dash-score-locked" onClick={onShowPaywall}>
          <div className="dash-score-left">
            <div className="dash-score-title">Weekly Score</div>
            <div className="dash-score-sub">Routines · Tasks</div>
            <div className="dash-score-breakdown">
              <span className="dash-score-chip">Upgrade to Pro to unlock</span>
            </div>
          </div>
          <div className="dash-score-lock"><Lock size={22} /></div>
        </button>
      )}

      <div className="stat-grid">
        <StatCard value={bestStreak}                    label="Best streak"    />
        <StatCard value={store.completions.length}      label="All-time done"  />
        <StatCard value={taskCompletionsThisWeek}       label="Tasks this wk"  />
        <StatCard value={completedGoals.length}         label="Goals done"     />
      </div>

      <InsightsCard store={store} />

      <CompoundEffectCard store={store} />

      <div className="card dash-section no-hover">
        <div className="dash-section-title">Completion — last 7 days</div>
        {store.habits.length === 0 ? (
          <div className="dash-empty">Add habits to see your consistency.</div>
        ) : (
          <div className="week-chart">
            {dayData.map(({ date, pct }) => {
              const isToday = date === todayStr
              const day = new Date(date + 'T00:00:00')
                .toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div key={date} className="week-bar-col">
                  <div className="week-bar-track">
                    <div
                      className={`week-bar-fill${isToday ? ' today' : ''}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <div className={`week-bar-day${isToday ? ' today' : ''}`}>{day}</div>
                  <div className="week-bar-pct">{pct > 0 ? `${pct}%` : '—'}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {store.habits.length > 0 && (
        <div className="card dash-section no-hover">
          <div className="dash-section-title">Routine breakdown — last 7 days</div>
          <div className="habit-breakdown">
            {habitBreakdown.map(({ habit, doneSet, rate }) => (
              <div key={habit.id} className="hb-row">
                <div className="hb-name">{habit.name}</div>
                <div className="hb-dots">
                  {days.map(d => (
                    <div
                      key={d}
                      className={`hb-dot${doneSet.has(d) ? ' done' : ''}${d === todayStr ? ' today' : ''}`}
                    />
                  ))}
                </div>
                <div className="hb-rate">{rate}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeGoals.length > 0 && (
        <div className="card dash-section no-hover">
          <div className="dash-section-title">Goals in progress</div>
          <div className="dash-goals">
            {activeGoals.map(goal => (
              <div key={goal.id} className="dash-goal-row">
                <div className="dash-goal-name">{goal.title}</div>
                <div className="dash-goal-bar-wrap">
                  <div className="dash-goal-bar">
                    <div className="dash-goal-fill" style={{ width: `${goal.progress ?? 0}%` }} />
                  </div>
                  <span className="dash-goal-pct">{goal.progress ?? 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

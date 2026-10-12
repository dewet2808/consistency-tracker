import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Target, Pencil, BookOpen, Timer, Sliders, TrendingUp } from 'lucide-react'
import './Goals.css'

const CATEGORIES = ['Health', 'Learning', 'Career', 'Finance', 'Personal', 'Other']

const GOAL_TYPES = [
  { value: 'custom',    label: 'Custom',    Icon: Sliders,     hint: 'Manual %'     },
  { value: 'amount',    label: 'Amount',    Icon: TrendingUp,  hint: 'Number target' },
  { value: 'book',      label: 'Book',      Icon: BookOpen,    hint: 'Pages read'   },
  { value: 'endurance', label: 'Endurance', Icon: Timer,       hint: 'Time goal'    },
]

const ENDURANCE_SPORTS = ['Running', 'Cycling', 'Swimming']

// ── Helpers ───────────────────────────────────────────────────────────────────

function secsToStr(secs) {
  if (!secs && secs !== 0) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function partsToSecs(m, s) {
  return (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0)
}

function calcProgress(type, meta = {}) {
  if (type === 'amount') {
    const target  = Number(meta.target)  || 0
    const current = Number(meta.current) || 0
    return target ? Math.min(100, Math.round((current / target) * 100)) : 0
  }
  if (type === 'book') {
    const total = Number(meta.total_pages) || 0
    const curr  = Number(meta.current_page) || 0
    return total ? Math.min(100, Math.round((curr / total) * 100)) : 0
  }
  if (type === 'endurance') {
    const start   = Number(meta.start_secs) || 0
    const goal    = Number(meta.goal_secs)  || 0
    // ?? doesn't catch NaN — use explicit null check so undefined/null fall back to start
    const current = meta.current_secs != null ? Number(meta.current_secs) : start
    if (!start || !goal || start <= goal) return 0
    return Math.min(100, Math.max(0, Math.round(((start - current) / (start - goal)) * 100)))
  }
  return null
}

// ── Form state defaults ───────────────────────────────────────────────────────

const EMPTY_BOOK      = { total_pages: '', current_page: '' }
const EMPTY_ENDURANCE = { sport: 'Running', distance: '', goal_m: '', goal_s: '', start_m: '', start_s: '' }
const EMPTY_AMOUNT    = { target: '', current: '', prefix: '' }

export default function Goals({ store, onToast, isPro = true, onShowPaywall }) {
  const [showForm, setShowForm]       = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [title, setTitle]             = useState('')
  const [desc, setDesc]               = useState('')
  const [category, setCategory]       = useState('Personal')
  const [targetDate, setTarget]       = useState('')
  const [goalType, setGoalType]       = useState('custom')
  const [bookMeta, setBookMeta]         = useState(EMPTY_BOOK)
  const [endMeta, setEndMeta]           = useState(EMPTY_ENDURANCE)
  const [amountMeta, setAmountMeta]     = useState(EMPTY_AMOUNT)
  const [saving, setSaving]             = useState(false)

  function openAdd() {
    const activeCount = store.goals.filter(g => !g.completed).length
    if (!isPro && activeCount >= 3) { onShowPaywall?.(); return }
    setEditingGoal(null)
    setTitle(''); setDesc(''); setCategory('Personal'); setTarget('')
    setGoalType('custom'); setBookMeta(EMPTY_BOOK); setEndMeta(EMPTY_ENDURANCE); setAmountMeta(EMPTY_AMOUNT)
    setShowForm(true)
  }

  function openEdit(goal) {
    setEditingGoal(goal)
    setTitle(goal.title)
    setDesc(goal.description ?? '')
    setCategory(goal.category ?? 'Personal')
    setTarget(goal.target_date ?? '')
    const type = goal.goal_type ?? 'custom'
    setGoalType(type)
    const meta = goal.metadata ?? {}
    if (type === 'amount') {
      setAmountMeta({ target: meta.target ?? '', current: meta.current ?? '', prefix: meta.prefix ?? '' })
      setBookMeta(EMPTY_BOOK); setEndMeta(EMPTY_ENDURANCE)
    } else if (type === 'book') {
      setBookMeta({ total_pages: meta.total_pages ?? '', current_page: meta.current_page ?? '' })
      setEndMeta(EMPTY_ENDURANCE); setAmountMeta(EMPTY_AMOUNT)
    } else if (type === 'endurance') {
      setEndMeta({
        sport:   meta.sport ?? 'Running',
        distance: meta.distance ?? '',
        goal_m:  meta.goal_secs  ? String(Math.floor(meta.goal_secs  / 60)) : '',
        goal_s:  meta.goal_secs  ? String(meta.goal_secs  % 60).padStart(2, '0') : '',
        start_m: meta.start_secs ? String(Math.floor(meta.start_secs / 60)) : '',
        start_s: meta.start_secs ? String(meta.start_secs % 60).padStart(2, '0') : '',
      })
      setBookMeta(EMPTY_BOOK)
    } else {
      setBookMeta(EMPTY_BOOK); setEndMeta(EMPTY_ENDURANCE); setAmountMeta(EMPTY_AMOUNT)
    }
    setShowForm(true)
  }

  function resetForm() { setEditingGoal(null); setShowForm(false) }

  function changeType(type) {
    setGoalType(type); setBookMeta(EMPTY_BOOK); setEndMeta(EMPTY_ENDURANCE); setAmountMeta(EMPTY_AMOUNT)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    let metadata = {}
    let progress  = editingGoal?.progress ?? 0

    if (goalType === 'amount') {
      metadata = {
        target:  Number(amountMeta.target)  || 0,
        current: Number(amountMeta.current) || 0,
        prefix:  amountMeta.prefix.trim(),
      }
      progress = calcProgress('amount', metadata)
    } else if (goalType === 'book') {
      metadata = {
        total_pages:  Number(bookMeta.total_pages)  || 0,
        current_page: Number(bookMeta.current_page) || 0,
      }
      progress = calcProgress('book', metadata)
    } else if (goalType === 'endurance') {
      const goal_secs  = partsToSecs(endMeta.goal_m,  endMeta.goal_s)
      const start_secs = partsToSecs(endMeta.start_m, endMeta.start_s)
      metadata = {
        sport:        endMeta.sport,
        distance:     endMeta.distance.trim(),
        goal_secs,
        start_secs,
        current_secs: editingGoal?.metadata?.current_secs ?? start_secs,
      }
      progress = calcProgress('endurance', metadata)
    }

    const payload = {
      title: title.trim(),
      description: desc.trim() || null,
      category,
      target_date: targetDate || null,
      goal_type: goalType,
      metadata,
      ...(progress !== null ? { progress } : {}),
    }

    let error
    if (editingGoal) {
      ;({ error } = await store.updateGoal(editingGoal.id, payload))
    } else {
      ;({ error } = await store.addGoal(payload))
    }
    setSaving(false)
    if (error) { onToast(editingGoal ? 'Failed to update' : 'Failed to add goal'); return }
    resetForm()
    onToast(editingGoal ? 'Goal updated!' : 'Goal added!')
  }

  async function handleDelete(id, goalTitle) {
    if (!confirm(`Delete "${goalTitle}"?`)) return
    const { error } = await store.deleteGoal(id)
    if (error) onToast('Failed to delete')
    else onToast('Goal deleted')
  }

  async function handleManualProgress(id, current, delta) {
    const next = Math.min(100, Math.max(0, current + delta))
    const { error } = await store.updateGoal(id, { progress: next })
    if (error) onToast('Failed to update progress')
  }

  async function handleComplete(goal) {
    const completing = !goal.completed
    const updates = { completed: completing }
    if (completing && (goal.progress ?? 0) < 100) updates.progress = 100
    const { error } = await store.updateGoal(goal.id, updates)
    if (error) onToast('Failed to update goal')
  }

  async function handleUpdateMeta(goal, patch) {
    const type     = goal.goal_type ?? 'custom'
    const metadata = { ...(goal.metadata ?? {}), ...patch }
    const progress = calcProgress(type, metadata)
    const { error } = await store.updateGoal(goal.id, {
      metadata,
      ...(progress !== null ? { progress } : {}),
    })
    if (error) onToast('Failed to save — please try again')
  }

  const active    = store.goals.filter(g => !g.completed)
  const completed = store.goals.filter(g => g.completed)

  const titlePlaceholder =
    goalType === 'book'      ? 'e.g. Finish Atomic Habits' :
    goalType === 'endurance' ? `e.g. Sub-21 5K ${endMeta.sport.toLowerCase()}` :
    goalType === 'amount'    ? 'e.g. Save R500 000' :
    'e.g. Learn Spanish'

  return (
    <div className="goals-page">
      <div className="page-header">
        <h2 className="page-title">Goals</h2>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={15} /> New Goal
        </button>
      </div>

      {showForm && (
        <form className="card goal-form no-hover" onSubmit={handleSubmit}>
          <div className="goal-form-heading">{editingGoal ? 'Edit goal' : 'New goal'}</div>

          {/* Type selector */}
          <div className="form-group">
            <label>Goal type</label>
            <div className="goal-type-grid">
              {GOAL_TYPES.map(({ value, label, Icon, hint }) => (
                <button key={value} type="button"
                  className={`goal-type-btn${goalType === value ? ' active' : ''}`}
                  onClick={() => changeType(value)}
                >
                  <Icon size={16} />
                  <span className="goal-type-label">{label}</span>
                  <span className="goal-type-hint">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Goal title</label>
            <input autoFocus placeholder={titlePlaceholder}
              value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          {/* Amount fields */}
          {goalType === 'amount' && (
            <>
              <div className="goal-form-row">
                <div className="form-group">
                  <label>Prefix / unit</label>
                  <input placeholder="R, $, kg…" value={amountMeta.prefix}
                    onChange={e => setAmountMeta(m => ({ ...m, prefix: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Target amount</label>
                  <input type="number" min="1" placeholder="500000"
                    value={amountMeta.target}
                    onChange={e => setAmountMeta(m => ({ ...m, target: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label>Current amount (optional)</label>
                <input type="number" min="0" placeholder="0"
                  value={amountMeta.current}
                  onChange={e => setAmountMeta(m => ({ ...m, current: e.target.value }))} />
              </div>
            </>
          )}

          {/* Book fields */}
          {goalType === 'book' && (
            <div className="goal-form-row">
              <div className="form-group">
                <label>Total pages</label>
                <input type="number" min="1" placeholder="350"
                  value={bookMeta.total_pages}
                  onChange={e => setBookMeta(m => ({ ...m, total_pages: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Current page</label>
                <input type="number" min="0" placeholder="0"
                  value={bookMeta.current_page}
                  onChange={e => setBookMeta(m => ({ ...m, current_page: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Endurance fields */}
          {goalType === 'endurance' && (
            <>
              <div className="goal-form-row">
                <div className="form-group">
                  <label>Sport</label>
                  <select value={endMeta.sport}
                    onChange={e => setEndMeta(m => ({ ...m, sport: e.target.value }))}>
                    {ENDURANCE_SPORTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Distance</label>
                  <input placeholder="e.g. 5 km"
                    value={endMeta.distance}
                    onChange={e => setEndMeta(m => ({ ...m, distance: e.target.value }))} />
                </div>
              </div>
              <div className="goal-form-row">
                <div className="form-group">
                  <label>Goal time</label>
                  <div className="time-row">
                    <input className="time-part" type="number" min="0" placeholder="mm"
                      value={endMeta.goal_m}
                      onChange={e => setEndMeta(m => ({ ...m, goal_m: e.target.value }))} />
                    <span className="time-sep">:</span>
                    <input className="time-part" type="number" min="0" max="59" placeholder="ss"
                      value={endMeta.goal_s}
                      onChange={e => setEndMeta(m => ({ ...m, goal_s: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Your current time</label>
                  <div className="time-row">
                    <input className="time-part" type="number" min="0" placeholder="mm"
                      value={endMeta.start_m}
                      onChange={e => setEndMeta(m => ({ ...m, start_m: e.target.value }))} />
                    <span className="time-sep">:</span>
                    <input className="time-part" type="number" min="0" max="59" placeholder="ss"
                      value={endMeta.start_s}
                      onChange={e => setEndMeta(m => ({ ...m, start_s: e.target.value }))} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="goal-form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Target date</label>
              <input type="date" value={targetDate} onChange={e => setTarget(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea rows={2} placeholder="Why does this matter?" value={desc}
              onChange={e => setDesc(e.target.value)} />
          </div>

          <div className="goal-form-actions">
            <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : editingGoal ? 'Save changes' : 'Add goal'}
            </button>
          </div>
        </form>
      )}

      {store.goals.length === 0 ? (
        <div className="goals-empty">
          <Target size={28} className="goals-empty-icon" />
          <div className="goals-empty-text">No goals yet</div>
          <div className="goals-empty-sub">Set your first goal to work towards something meaningful.</div>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="goals-section">
              <div className="goals-section-title">Active ({active.length})</div>
              <div className="goal-list">
                {active.map(goal => (
                  <GoalCard key={goal.id} goal={goal}
                    onEdit={() => openEdit(goal)}
                    onDelete={handleDelete}
                    onManualProgress={handleManualProgress}
                    onComplete={handleComplete}
                    onUpdateMeta={handleUpdateMeta}
                  />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div className="goals-section">
              <div className="goals-section-title">Completed ({completed.length})</div>
              <div className="goal-list">
                {completed.map(goal => (
                  <GoalCard key={goal.id} goal={goal}
                    onEdit={() => openEdit(goal)}
                    onDelete={handleDelete}
                    onManualProgress={handleManualProgress}
                    onComplete={handleComplete}
                    onUpdateMeta={handleUpdateMeta}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── GoalCard ──────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit, onDelete, onManualProgress, onComplete, onUpdateMeta }) {
  const [logOpen,   setLogOpen]   = useState(false)
  const [newPage,   setNewPage]   = useState('')
  const [logMins,   setLogMins]   = useState('')
  const [logSecs,   setLogSecs]   = useState('')
  const [logAmount, setLogAmount] = useState('')
  const [saving,    setSaving]    = useState(false)

  const type = goal.goal_type ?? 'custom'
  const meta = goal.metadata ?? {}

  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const sport = meta.sport ?? 'Running'

  async function logAmountValue() {
    const val = parseFloat(logAmount)
    if (isNaN(val) || val < 0) return
    setSaving(true)
    await onUpdateMeta(goal, { current: val })
    setSaving(false)
    setLogAmount(''); setLogOpen(false)
  }

  async function logBook() {
    const page = parseInt(newPage, 10)
    if (!page || page < 0) return
    setSaving(true)
    await onUpdateMeta(goal, { current_page: Math.min(page, Number(meta.total_pages) || page) })
    setSaving(false)
    setNewPage(''); setLogOpen(false)
  }

  async function logEndurance() {
    const secs = (parseInt(logMins, 10) || 0) * 60 + (parseInt(logSecs, 10) || 0)
    if (!secs) return
    setSaving(true)
    await onUpdateMeta(goal, { current_secs: secs })
    setSaving(false)
    setLogMins(''); setLogSecs(''); setLogOpen(false)
  }

  const improvement = type === 'endurance' && meta.start_secs && meta.current_secs
    ? meta.start_secs - meta.current_secs
    : null

  return (
    <div className={`card goal-card no-hover${goal.completed ? ' completed' : ''}`}>
      <div className="goal-card-header">
        <div className="goal-card-title">{goal.title}</div>
        <div className="goal-card-actions">
          <button className="icon-btn" onClick={onEdit} title="Edit"><Pencil size={14} /></button>
          <button className="goal-complete-btn" onClick={() => onComplete(goal)}
            title={goal.completed ? 'Mark active' : 'Mark complete'}>
            <CheckCircle2 size={18} className={goal.completed ? 'done' : ''} />
          </button>
          <button className="btn-danger" onClick={() => onDelete(goal.id, goal.title)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="goal-meta">
        <span className="badge badge-accent">{goal.category}</span>
        {type === 'book'      && <span className="badge badge-type"><BookOpen size={11} /> Book</span>}
        {type === 'endurance' && <span className="badge badge-type">{sport}</span>}
        {daysLeft !== null && !goal.completed && (
          <span className={`badge ${daysLeft < 0 ? 'badge-danger' : daysLeft < 7 ? 'badge-yellow' : 'badge-green'}`}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
          </span>
        )}
      </div>

      {goal.description && <div className="goal-desc">{goal.description}</div>}

      {/* Amount tracker */}
      {type === 'amount' && Number(meta.target) > 0 && (
        <div className="goal-tracker-info">
          <div className="tracker-main">
            <span className="tracker-value">{meta.prefix}{Number(meta.current ?? 0).toLocaleString()}</span>
            <span className="tracker-denom">/ {meta.prefix}{Number(meta.target).toLocaleString()}</span>
          </div>
          <span className="tracker-aside">
            {meta.prefix}{(Number(meta.target) - Number(meta.current ?? 0)).toLocaleString()} to go
          </span>
        </div>
      )}

      {/* Book tracker */}
      {type === 'book' && Number(meta.total_pages) > 0 && (
        <div className="goal-tracker-info">
          <div className="tracker-main">
            <span className="tracker-value">{meta.current_page ?? 0}</span>
            <span className="tracker-denom">/ {meta.total_pages} pages</span>
          </div>
          <span className="tracker-aside">{Number(meta.total_pages) - Number(meta.current_page ?? 0)} left</span>
        </div>
      )}

      {/* Endurance tracker */}
      {type === 'endurance' && meta.goal_secs > 0 && (
        <div className="goal-tracker-info">
          <div className="tracker-main">
            {meta.distance && <span className="tracker-distance">{meta.distance}</span>}
            <span className="tracker-value">{secsToStr(meta.current_secs ?? meta.start_secs)}</span>
            <span className="tracker-denom">→ goal {secsToStr(meta.goal_secs)}</span>
          </div>
          {improvement !== null && improvement > 0 && (
            <span className="tracker-aside tracker-gain">−{secsToStr(improvement)}</span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="goal-progress-row">
        <div className="goal-bar">
          <div className="goal-bar-fill" style={{ width: `${goal.progress ?? 0}%` }} />
        </div>
        <span className="goal-pct">{goal.progress ?? 0}%</span>
        {type === 'custom' && !goal.completed && (
          <div className="goal-progress-btns">
            <button className="progress-btn" onClick={() => onManualProgress(goal.id, goal.progress ?? 0, -10)}>−</button>
            <button className="progress-btn" onClick={() => onManualProgress(goal.id, goal.progress ?? 0, +10)}>+</button>
          </div>
        )}
        {type !== 'custom' && !goal.completed && (
          <button className="btn-log" onClick={() => setLogOpen(v => !v)}>
            {logOpen ? 'Cancel' : 'Log'}
          </button>
        )}
      </div>

      {/* Book log */}
      {logOpen && type === 'book' && (
        <div className="goal-log-panel">
          <label>Current page</label>
          <div className="goal-log-row">
            <input type="number" min="0" max={meta.total_pages}
              placeholder={`1 – ${meta.total_pages}`}
              value={newPage} onChange={e => setNewPage(e.target.value)} autoFocus />
            <button className="btn-primary" onClick={logBook} disabled={saving || !newPage}>
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Amount log */}
      {logOpen && type === 'amount' && (
        <div className="goal-log-panel">
          <label>Current amount</label>
          <div className="goal-log-row">
            <input type="number" min="0"
              placeholder={meta.prefix ? `${meta.prefix}0` : '0'}
              value={logAmount} onChange={e => setLogAmount(e.target.value)} autoFocus />
            <button className="btn-primary" onClick={logAmountValue} disabled={saving || logAmount === ''}>
              {saving ? '…' : 'Save'}
            </button>
          </div>
          {Number(meta.target) > 0 && (
            <div className="goal-log-hint">
              Target: {meta.prefix}{Number(meta.target).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Endurance log */}
      {logOpen && type === 'endurance' && (
        <div className="goal-log-panel">
          <label>
            Latest {sport.toLowerCase()} time{meta.distance ? ` (${meta.distance})` : ''}
          </label>
          <div className="goal-log-row">
            <div className="time-row">
              <input className="time-part" type="number" min="0" placeholder="mm"
                value={logMins} onChange={e => setLogMins(e.target.value)} autoFocus />
              <span className="time-sep">:</span>
              <input className="time-part" type="number" min="0" max="59" placeholder="ss"
                value={logSecs} onChange={e => setLogSecs(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={logEndurance} disabled={saving || (!logMins && !logSecs)}>
              {saving ? '…' : 'Save'}
            </button>
          </div>
          {meta.goal_secs > 0 && (
            <div className="goal-log-hint">Goal: {secsToStr(meta.goal_secs)}</div>
          )}
        </div>
      )}
    </div>
  )
}

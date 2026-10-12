import { useState, useRef } from 'react'
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, CheckSquare, Pencil, GripVertical, Check } from 'lucide-react'
import SmallRing from '../components/SmallRing'
import './Tasks.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ORDINALS = Array.from({ length: 31 }, (_, i) => {
  const n = i + 1
  const s = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return { value: n, label: `${n}${s}` }
})

const RECURRENCE_TYPES = [
  { id: 'weekly',   label: 'Weekly'        },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'monthly',  label: 'Monthly'       },
  { id: 'once',     label: 'One-off'       },
]

function scheduleLabel(task) {
  switch (task.recurrence) {
    case 'weekly':   return formatWeekDays(task.days)
    case 'biweekly': return 'Every other ' + formatWeekDays(task.days)
    case 'monthly': {
      const n = task.days?.[0]
      if (!n) return ''
      const s = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
      return `Monthly on the ${n}${s}`
    }
    case 'once':
      return task.due_date
        ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : ''
    default: return ''
  }
}

function formatWeekDays(days) {
  if (!days || days.length === 0) return ''
  if (days.length === 7) return 'Every day'
  if (JSON.stringify([...days].sort()) === JSON.stringify([1,2,3,4,5])) return 'Weekdays'
  if (JSON.stringify([...days].sort()) === JSON.stringify([0,6])) return 'Weekends'
  return [...days].sort((a, b) => a - b).map(d => DAYS[d]).join(', ')
}

// ── Swipe-to-delete wrapper ───────────────────────────────────────────────────

function SwipeToDelete({ onDelete, children }) {
  const [offset, setOffset] = useState(0)
  const startX    = useRef(null)
  const startY    = useRef(null)
  const dirLocked = useRef(null)

  function onTouchStart(e) {
    startX.current    = e.touches[0].clientX
    startY.current    = e.touches[0].clientY
    dirLocked.current = null
  }

  function onTouchMove(e) {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (dirLocked.current === null) {
      dirLocked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (dirLocked.current === 'h' && dx < 0) {
      e.preventDefault()
      setOffset(Math.max(dx, -80))
    }
  }

  function onTouchEnd() {
    if (offset < -55) {
      setOffset(-400)
      setTimeout(onDelete, 220)
    } else {
      setOffset(0)
    }
  }

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div className="todo-delete-bg">
        <Trash2 size={16} color="#fff" />
      </div>
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? 'transform 0.2s ease' : 'none',
          willChange: 'transform',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

// ── Sortable todo item ────────────────────────────────────────────────────────

function SortableTodoItem({ todo, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <SwipeToDelete onDelete={() => onDelete(todo.id)}>
        <div className={`todo-row card no-hover${todo.completed ? ' todo-done' : ''}`}>
          <div className="todo-drag-handle" {...attributes} {...listeners}>
            <GripVertical size={16} />
          </div>
          <button className="todo-check" onClick={() => onToggle(todo.id)}>
            {todo.completed && <Check size={10} strokeWidth={3} />}
          </button>
          <span className="todo-title">{todo.title}</span>
        </div>
      </SwipeToDelete>
    </div>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────

function TasksSummary({ store }) {
  const todayTasks = store.getTodayTasks()
  const done       = todayTasks.filter(t => store.isTaskDone(t.id)).length
  const total      = todayTasks.length
  const pct        = total ? Math.round((done / total) * 100) : 0
  const allTasks   = store.tasks.length

  const statusText = done === total && total > 0
    ? 'All done today!'
    : total === 0
    ? 'Nothing due today'
    : `${total - done} task${total - done > 1 ? 's' : ''} left today`

  return (
    <div className="card no-hover tasks-summary">
      {total > 0 ? (
        <SmallRing pct={pct} done={done} total={total} />
      ) : (
        <div className="tasks-summary-nodue">
          <CheckSquare size={28} style={{ color: 'var(--muted)' }} />
        </div>
      )}
      <div className="tasks-summary-content">
        <div className="tasks-summary-title">Today's recurring</div>
        <div className="tasks-summary-status">{statusText}</div>
        <div className="tasks-summary-chips">
          <span className="stat-chip">{allTasks} active task{allTasks !== 1 ? 's' : ''}</span>
          {total > 0 && <span className="stat-chip">{total} due today</span>}
        </div>
      </div>
    </div>
  )
}

// ── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, isDueToday, isDone, onEdit, onDelete }) {
  return (
    <div className={`card task-row no-hover${isDueToday ? ' due-today' : ''}`}>
      <div className="task-row-info">
        <div className="task-row-title-row">
          <div className="task-row-title">{task.title}</div>
          {isDueToday && (
            <span className={`task-due-badge${isDone ? ' done' : ' pending'}`}>
              {isDone ? '✓ Done' : 'Due today'}
            </span>
          )}
        </div>
        <div className="task-row-schedule">{scheduleLabel(task)}</div>
      </div>
      <div className="task-row-actions">
        <button className="icon-btn" onClick={onEdit} title="Edit">
          <Pencil size={14} />
        </button>
        <button className="btn-danger" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Tasks page ────────────────────────────────────────────────────────────────

export default function Tasks({ store, onToast }) {
  const [showForm, setShowForm]         = useState(false)
  const [editingTask, setEditingTask]   = useState(null)
  const [title, setTitle]               = useState('')
  const [recurrence, setRecurrence]     = useState('weekly')
  const [selectedDays, setSelectedDays] = useState([])
  const [dayOfMonth, setDayOfMonth]     = useState(1)
  const [dueDate, setDueDate]           = useState('')
  const [saving, setSaving]             = useState(false)
  const [todoInput, setTodoInput]       = useState('')

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = store.todos.findIndex(t => t.id === active.id)
    const newIdx = store.todos.findIndex(t => t.id === over.id)
    store.reorderTodos(arrayMove(store.todos, oldIdx, newIdx))
  }

  async function handleAddTodo(e) {
    e?.preventDefault()
    const text = todoInput.trim()
    if (!text) return
    setTodoInput('')
    const { error } = await store.addTodo(text)
    if (error) onToast('Failed to add')
  }

  function toggleDay(day) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function openAdd() {
    setEditingTask(null)
    setTitle(''); setRecurrence('weekly'); setSelectedDays([]); setDayOfMonth(1); setDueDate('')
    setShowForm(true)
  }

  function openEdit(task) {
    setEditingTask(task)
    setTitle(task.title)
    setRecurrence(task.recurrence)
    setSelectedDays(
      task.recurrence === 'weekly' || task.recurrence === 'biweekly'
        ? (task.days ?? []) : []
    )
    setDayOfMonth(task.recurrence === 'monthly' ? (task.days?.[0] ?? 1) : 1)
    setDueDate(task.due_date ?? '')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    if ((recurrence === 'weekly' || recurrence === 'biweekly') && selectedDays.length === 0) {
      onToast('Select at least one day'); return
    }
    const todayStr = new Date().toISOString().slice(0, 10)
    const payload = {
      title: title.trim(), recurrence,
      days:     recurrence === 'monthly'                               ? [dayOfMonth]
              : (recurrence === 'weekly' || recurrence === 'biweekly') ? selectedDays
              : null,
      due_date: recurrence === 'once'     ? dueDate
              : recurrence === 'biweekly' ? (editingTask?.due_date ?? todayStr)
              : null,
    }
    setSaving(true)
    let error
    if (editingTask) {
      ;({ error } = await store.updateTask(editingTask.id, payload))
    } else {
      ;({ error } = await store.addTask(payload))
    }
    setSaving(false)
    if (error) { onToast(editingTask ? 'Failed to update' : 'Failed to add task'); return }
    resetForm()
    onToast(editingTask ? 'Task updated!' : 'Task added!')
  }

  function resetForm() {
    setTitle(''); setSelectedDays([]); setDayOfMonth(1); setDueDate('')
    setEditingTask(null); setShowForm(false)
  }

  async function handleDelete(id, taskTitle) {
    if (!confirm(`Delete "${taskTitle}"?`)) return
    const { error } = await store.deleteTask(id)
    if (error) onToast('Failed to delete')
    else onToast('Task deleted')
  }

  const needsDaySel = recurrence === 'weekly' || recurrence === 'biweekly'
  const grouped = {
    weekly:   store.tasks.filter(t => t.recurrence === 'weekly'),
    biweekly: store.tasks.filter(t => t.recurrence === 'biweekly'),
    monthly:  store.tasks.filter(t => t.recurrence === 'monthly'),
    once:     store.tasks.filter(t => t.recurrence === 'once'),
  }
  const GROUP_LABELS = { weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly', once: 'One-off' }
  const todayTaskIds = new Set(store.getTodayTasks().map(t => t.id))

  return (
    <div className="tasks-page">

      {/* ── To-Do List ── */}
      <div className="page-header">
        <h2 className="page-title">To-Do List</h2>
      </div>

      <form className="todo-add-form" onSubmit={handleAddTodo}>
        <input
          className="todo-add-input"
          placeholder="Add a to-do..."
          value={todoInput}
          onChange={e => setTodoInput(e.target.value)}
        />
        <button type="submit" className="btn-primary todo-add-btn" disabled={!todoInput.trim()}>
          <Plus size={15} />
        </button>
      </form>

      {store.todos.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={store.todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="todo-list">
              {store.todos.map(todo => (
                <SortableTodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={store.toggleTodo}
                  onDelete={store.deleteTodo}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="todo-empty">No to-dos yet — add one above</div>
      )}

      <div className="tasks-section-divider" />

      {/* ── Recurring Tasks ── */}
      <div className="page-header">
        <h2 className="page-title">Recurring Tasks</h2>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={15} /> New Task
        </button>
      </div>

      {store.tasks.length > 0 && <TasksSummary store={store} />}

      {showForm && (
        <form className="card task-form no-hover" onSubmit={handleSubmit}>
          <div className="task-form-heading">
            {editingTask ? 'Edit task' : 'New task'}
          </div>
          <div className="form-group">
            <label>Task name</label>
            <input
              autoFocus
              placeholder="e.g. Review finances"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="task-type-toggle">
            {RECURRENCE_TYPES.map(r => (
              <button
                key={r.id} type="button"
                className={`type-btn${recurrence === r.id ? ' active' : ''}`}
                onClick={() => { setRecurrence(r.id); setSelectedDays([]) }}
              >
                {r.label}
              </button>
            ))}
          </div>
          {needsDaySel && (
            <div className="form-group">
              <label>{recurrence === 'biweekly' ? 'Repeat every 2nd' : 'Repeat on'}</label>
              <div className="day-selector">
                {DAYS.map((day, i) => (
                  <button
                    key={i} type="button"
                    className={`day-btn${selectedDays.includes(i) ? ' active' : ''}`}
                    onClick={() => toggleDay(i)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
          {recurrence === 'monthly' && (
            <div className="form-group">
              <label>Day of month</label>
              <select value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))}>
                {ORDINALS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}
          {recurrence === 'once' && (
            <div className="form-group">
              <label>Due date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>
          )}
          <div className="task-form-actions">
            <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : editingTask ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      )}

      {store.tasks.length === 0 ? (
        <div className="tasks-empty">
          <CheckSquare size={28} className="tasks-empty-icon" />
          <div className="tasks-empty-text">No recurring tasks yet</div>
          <div className="tasks-empty-sub">Add weekly, fortnightly, monthly, or one-off tasks.</div>
        </div>
      ) : (
        Object.entries(grouped).map(([key, list]) =>
          list.length === 0 ? null : (
            <div key={key} className="task-group">
              <div className="task-group-title">{GROUP_LABELS[key]}</div>
              <div className="task-list">
                {list.map(task => {
                  const isDueToday = todayTaskIds.has(task.id)
                  const isDone     = isDueToday && store.isTaskDone(task.id)
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isDueToday={isDueToday}
                      isDone={isDone}
                      onEdit={() => openEdit(task)}
                      onDelete={() => handleDelete(task.id, task.title)}
                    />
                  )
                })}
              </div>
            </div>
          )
        )
      )}
    </div>
  )
}

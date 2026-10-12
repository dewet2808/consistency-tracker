import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const today = () => new Date().toISOString().slice(0, 10)

export function useStore(user) {
  const [habits, setHabits]                   = useState([])
  const [completions, setCompletions]         = useState([])
  const [goals, setGoals]                     = useState([])
  const [focusSessions, setFocusSessions]     = useState([])
  const [checkIns, setCheckIns]               = useState([])
  const [tasks, setTasks]                     = useState([])
  const [taskCompletions, setTaskCompletions] = useState([])
  const [todos, setTodos]                     = useState([])
  const [loadingData, setLoadingData]         = useState(true)

  useEffect(() => {
    if (!user) return
    setLoadingData(true)
    // Limit completions to last 2 years — enough for all insights/streaks
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 2)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('habit_completions').select('*').eq('user_id', user.id).gte('date', cutoffStr),
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('focus_sessions').select('*').eq('user_id', user.id).order('started_at', { ascending: false }).limit(200),
      supabase.from('check_ins').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(90),
      supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('task_completions').select('*').eq('user_id', user.id).gte('date', cutoffStr),
      supabase.from('todos').select('*').eq('user_id', user.id).order('sort_order'),
    ]).then(([h, c, g, f, ci, t, tc, td]) => {
      setHabits(h.data ?? [])
      setCompletions(c.data ?? [])
      setGoals(g.data ?? [])
      setFocusSessions(f.data ?? [])
      setCheckIns(ci.data ?? [])
      setTasks(t.data ?? [])
      setTaskCompletions(tc.data ?? [])
      setTodos(td.data ?? [])
      setLoadingData(false)
    }).catch(() => {
      setLoadingData(false)
    })
  }, [user])

  // ── Habits ───────────────────────────────────────────────────────────────────

  const addHabit = useCallback(async ({ name, icon, frequency = 'daily', target_days = 7 }) => {
    if (!name || name.length > 200) return { error: new Error('Habit name must be 1–200 characters') }
    const { data, error } = await supabase.from('habits').insert({
      user_id: user.id, name, icon, frequency, target_days,
    }).select().single()
    if (!error) setHabits(prev => [...prev, data])
    return { error }
  }, [user])

  const updateHabit = useCallback(async (id, changes) => {
    const { data, error } = await supabase.from('habits').update(changes).eq('id', id).select().single()
    if (!error) setHabits(prev => prev.map(h => h.id === id ? data : h))
    return { error }
  }, [])

  const deleteHabit = useCallback(async (id) => {
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (!error) {
      setHabits(prev => prev.filter(h => h.id !== id))
      setCompletions(prev => prev.filter(c => c.habit_id !== id))
    }
    return { error }
  }, [])

  const toggleHabit = useCallback(async (habitId, date = today()) => {
    const existing = completions.find(c => c.habit_id === habitId && c.date === date)
    if (existing) {
      const { error } = await supabase.from('habit_completions').delete().eq('id', existing.id)
      if (!error) setCompletions(prev => prev.filter(c => c.id !== existing.id))
      return { error }
    } else {
      const { data, error } = await supabase.from('habit_completions').insert({
        user_id: user.id, habit_id: habitId, date,
      }).select().single()
      if (!error) setCompletions(prev => [...prev, data])
      return { error }
    }
  }, [completions, user])

  const isCompleted = useCallback((habitId, date = today()) => {
    return completions.some(c => c.habit_id === habitId && c.date === date)
  }, [completions])

  const getWeeklyCount = useCallback((habitId) => {
    const today = new Date()
    const dow   = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const mon = monday.toISOString().slice(0, 10)
    const sun = sunday.toISOString().slice(0, 10)
    return completions.filter(c => c.habit_id === habitId && c.date >= mon && c.date <= sun).length
  }, [completions])

  const getStreak = useCallback((habitId) => {
    const dateSet = new Set(
      completions.filter(c => c.habit_id === habitId).map(c => c.date)
    )
    if (!dateSet.size) return 0
    let streak = 0
    let cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const d = cursor.toISOString().slice(0, 10)
      if (dateSet.has(d)) {
        streak++
      } else if (i > 0) {
        break
      }
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }, [completions])

  // ── Goals ────────────────────────────────────────────────────────────────────

  const addGoal = useCallback(async ({ title, description, target_date, category, goal_type = 'custom', metadata = {}, progress = 0 }) => {
    if (!title || title.length > 200) return { error: new Error('Goal title must be 1–200 characters') }
    const { data, error } = await supabase.from('goals').insert({
      user_id: user.id, title, description, target_date, category, goal_type, metadata, progress,
    }).select().single()
    if (!error) setGoals(prev => [...prev, data])
    return { error }
  }, [user])

  const updateGoal = useCallback(async (id, changes) => {
    const { data, error } = await supabase.from('goals').update(changes).eq('id', id).select().single()
    if (!error) setGoals(prev => prev.map(g => g.id === id ? data : g))
    return { error }
  }, [])

  const deleteGoal = useCallback(async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (!error) setGoals(prev => prev.filter(g => g.id !== id))
    return { error }
  }, [])

  // ── Focus sessions ────────────────────────────────────────────────────────────

  const addFocusSession = useCallback(async ({ duration_minutes, label }) => {
    const { data, error } = await supabase.from('focus_sessions').insert({
      user_id: user.id, duration_minutes, label,
      started_at: new Date().toISOString(),
    }).select().single()
    if (!error) setFocusSessions(prev => [data, ...prev])
    return { error }
  }, [user])

  // ── Check-ins ─────────────────────────────────────────────────────────────────

  const upsertCheckIn = useCallback(async ({ date = today(), mood, energy, note }) => {
    const { data, error } = await supabase.from('check_ins').upsert({
      user_id: user.id, date, mood, energy, note,
    }, { onConflict: 'user_id,date' }).select().single()
    if (!error) {
      setCheckIns(prev => {
        const exists = prev.some(c => c.date === date)
        return exists ? prev.map(c => c.date === date ? data : c) : [data, ...prev]
      })
    }
    return { error }
  }, [user])

  const getTodayCheckIn = useCallback(() => {
    return checkIns.find(c => c.date === today()) ?? null
  }, [checkIns])

  // ── Tasks ─────────────────────────────────────────────────────────────────────

  const addTask = useCallback(async ({ title, recurrence, days, due_date }) => {
    const { data, error } = await supabase.from('tasks').insert({
      user_id: user.id, title, recurrence, days: days ?? null, due_date: due_date ?? null,
    }).select().single()
    if (!error) setTasks(prev => [...prev, data])
    return { error }
  }, [user])

  const updateTask = useCallback(async (id, changes) => {
    const { data, error } = await supabase.from('tasks').update(changes).eq('id', id).select().single()
    if (!error) setTasks(prev => prev.map(t => t.id === id ? data : t))
    return { error }
  }, [])

  const deleteTask = useCallback(async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== id))
      setTaskCompletions(prev => prev.filter(c => c.task_id !== id))
    }
    return { error }
  }, [])

  const toggleTask = useCallback(async (taskId, date = today()) => {
    const existing = taskCompletions.find(c => c.task_id === taskId && c.date === date)
    if (existing) {
      const { error } = await supabase.from('task_completions').delete().eq('id', existing.id)
      if (!error) setTaskCompletions(prev => prev.filter(c => c.id !== existing.id))
      return { error }
    } else {
      const { data, error } = await supabase.from('task_completions').insert({
        user_id: user.id, task_id: taskId, date,
      }).select().single()
      if (!error) setTaskCompletions(prev => [...prev, data])
      return { error }
    }
  }, [taskCompletions, user])

  const isTaskDone = useCallback((taskId, date = today()) => {
    return taskCompletions.some(c => c.task_id === taskId && c.date === date)
  }, [taskCompletions])

  const getTasksForDate = useCallback((dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    const dayOfWeek  = date.getDay()
    const dayOfMonth = date.getDate()

    const getMondayOf = d => {
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const m = new Date(d)
      m.setDate(d.getDate() + diff)
      m.setHours(0, 0, 0, 0)
      return m
    }

    return tasks.filter(task => {
      switch (task.recurrence) {
        case 'weekly':
          return task.days?.includes(dayOfWeek)

        case 'biweekly': {
          if (!task.days?.includes(dayOfWeek)) return false
          if (!task.due_date) return false
          const ref     = new Date(task.due_date + 'T00:00:00')
          const refMon  = getMondayOf(ref)
          const dateMon = getMondayOf(date)
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
  }, [tasks])

  const getTodayTasks = useCallback(() => getTasksForDate(today()), [getTasksForDate])

  // ── Todos ─────────────────────────────────────────────────────────────────────

  const addTodo = useCallback(async (title) => {
    if (!title || title.length > 500) return { error: new Error('Todo title must be 1–500 characters') }
    const sort_order = todos.length
    const { data, error } = await supabase.from('todos').insert({
      user_id: user.id, title, sort_order,
    }).select().single()
    if (!error) setTodos(prev => [...prev, data])
    return { error }
  }, [user, todos.length])

  const toggleTodo = useCallback(async (id) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    const { data, error } = await supabase.from('todos')
      .update({ completed: !todo.completed }).eq('id', id).select().single()
    if (!error) setTodos(prev => prev.map(t => t.id === id ? data : t))
    return { error }
  }, [todos])

  const deleteTodo = useCallback(async (id) => {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (!error) setTodos(prev => prev.filter(t => t.id !== id))
    return { error }
  }, [])

  const reorderTodos = useCallback(async (newOrder) => {
    const updated = newOrder.map((t, i) => ({ ...t, sort_order: i }))
    setTodos(updated)
    await supabase.from('todos').upsert(
      updated.map(t => ({ id: t.id, user_id: user.id, sort_order: t.sort_order }))
    )
  }, [user])

  // ── Accountability Partner ────────────────────────────────────────────────────

  const ensureShareCode = useCallback(async (stats) => {
    const { data: existing } = await supabase
      .from('partner_shares')
      .select('code')
      .eq('user_id', user.id)
      .single()

    if (existing?.code) {
      const { data, error } = await supabase
        .from('partner_shares')
        .update({ stats, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select('code, stats, updated_at')
        .single()
      return { data: data ?? existing, error }
    }

    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const { data, error } = await supabase
      .from('partner_shares')
      .insert({ user_id: user.id, code, stats })
      .select('code, stats, updated_at')
      .single()
    return { data, error }
  }, [user])

  const getPartnerStats = useCallback(async (code) => {
    const { data, error } = await supabase
      .from('partner_shares')
      .select('code, stats, updated_at')
      .eq('code', code.toUpperCase().trim())
      .single()
    return { data, error }
  }, [])

  return {
    // data
    habits, completions, goals, focusSessions, checkIns, tasks, taskCompletions, todos, loadingData,
    // habits
    addHabit, updateHabit, deleteHabit, toggleHabit, isCompleted, getStreak, getWeeklyCount,
    // goals
    addGoal, updateGoal, deleteGoal,
    // focus
    addFocusSession,
    // check-ins
    upsertCheckIn, getTodayCheckIn,
    // tasks
    addTask, updateTask, deleteTask, toggleTask, isTaskDone, getTodayTasks, getTasksForDate,
    // todos
    addTodo, toggleTodo, deleteTodo, reorderTodos,
    // partner
    ensureShareCode, getPartnerStats,
  }
}

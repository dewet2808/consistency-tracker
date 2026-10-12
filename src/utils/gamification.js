// ── XP ───────────────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [
  { level: 1,  xp: 0,     name: 'Beginner'    },
  { level: 2,  xp: 100,   name: 'Builder'      },
  { level: 3,  xp: 300,   name: 'Consistent'   },
  { level: 4,  xp: 600,   name: 'Dedicated'    },
  { level: 5,  xp: 1100,  name: 'Disciplined'  },
  { level: 6,  xp: 1800,  name: 'Focused'      },
  { level: 7,  xp: 2800,  name: 'Driven'       },
  { level: 8,  xp: 4200,  name: 'Relentless'   },
  { level: 9,  xp: 6000,  name: 'Unstoppable'  },
  { level: 10, xp: 8500,  name: 'Elite'        },
]

function getPerfectDays(completions, habitCount) {
  if (!habitCount) return 0
  const byDate = new Map()
  completions.forEach(c => byDate.set(c.date, (byDate.get(c.date) ?? 0) + 1))
  let count = 0
  byDate.forEach(n => { if (n >= habitCount) count++ })
  return count
}

export function computeXP(store) {
  const habitXP     = store.completions.length * 10
  const taskXP      = store.taskCompletions.length * 15
  const perfectDays = getPerfectDays(store.completions, store.habits.length)
  const bonusXP     = perfectDays * 25
  const total       = habitXP + taskXP + bonusXP

  let current = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  let next    = null
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (total < LEVEL_THRESHOLDS[i].xp) { next = LEVEL_THRESHOLDS[i]; current = LEVEL_THRESHOLDS[i - 1]; break }
    current = LEVEL_THRESHOLDS[i]
  }

  const xpInLevel   = total - current.xp
  const xpForNext   = next ? next.xp - current.xp : null
  const pct         = next ? Math.round((xpInLevel / xpForNext) * 100) : 100

  return { xp: total, level: current.level, levelName: current.name, xpInLevel, xpForNext, pct }
}

// ── Achievements ─────────────────────────────────────────────────────────────

function maxStreak(habitId, completions) {
  const dates = completions.filter(c => c.habit_id === habitId).map(c => c.date).sort()
  if (!dates.length) return 0
  let max = 1, cur = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i] + 'T00:00:00') - new Date(dates[i-1] + 'T00:00:00')) / 86400000
    if (diff === 1) { cur++; if (cur > max) max = cur } else cur = 1
  }
  return max
}

function distinctDays(completions) {
  return new Set(completions.map(c => c.date)).size
}

function hasPerfectDay(completions, habitCount) {
  if (!habitCount) return false
  const byDate = new Map()
  completions.forEach(c => byDate.set(c.date, (byDate.get(c.date) ?? 0) + 1))
  return [...byDate.values()].some(n => n >= habitCount)
}

export const ACHIEVEMENTS = [
  {
    id:   'first_step',
    name: 'First Step',
    desc: 'Complete your first routine',
    icon: 'Play',
    check: s => s.completions.length >= 1,
  },
  {
    id:   'on_fire',
    name: 'On Fire',
    desc: '7-day streak on any routine',
    icon: 'Flame',
    check: s => s.habits.some(h => maxStreak(h.id, s.completions) >= 7),
  },
  {
    id:   'week_warrior',
    name: 'Week Warrior',
    desc: 'Perfect day 7 times',
    icon: 'Shield',
    check: s => getPerfectDays(s.completions, s.habits.length) >= 7,
  },
  {
    id:   'perfect_day',
    name: 'Perfect Day',
    desc: 'Complete every routine in one day',
    icon: 'Star',
    check: s => hasPerfectDay(s.completions, s.habits.length),
  },
  {
    id:   'century',
    name: 'Century',
    desc: '100 routine completions',
    icon: 'Award',
    check: s => s.completions.length >= 100,
  },
  {
    id:   'task_master',
    name: 'Task Master',
    desc: 'Complete 25 tasks',
    icon: 'CheckSquare',
    check: s => s.taskCompletions.length >= 25,
  },
  {
    id:   'goal_getter',
    name: 'Goal Getter',
    desc: 'Reach 100% on a goal',
    icon: 'Target',
    check: s => s.goals.some(g => g.progress >= 100),
  },
  {
    id:   'consistent',
    name: 'Consistent',
    desc: 'Active on 30 different days',
    icon: 'Calendar',
    check: s => distinctDays(s.completions) >= 30,
  },
  {
    id:   'month_master',
    name: 'Month Master',
    desc: '30-day streak on any routine',
    icon: 'CalendarCheck',
    check: s => s.habits.some(h => maxStreak(h.id, s.completions) >= 30),
  },
  {
    id:   'habit_collector',
    name: 'Habit Builder',
    desc: 'Add 5 or more routines',
    icon: 'Layers',
    check: s => s.habits.length >= 5,
  },
  {
    id:   'dedicated',
    name: 'Dedicated',
    desc: 'Active on 100 different days',
    icon: 'Medal',
    check: s => distinctDays(s.completions) >= 100,
  },
  {
    id:   'legend',
    name: 'Legend',
    desc: 'Reach Level 10',
    icon: 'Crown',
    check: s => computeXP(s).level >= 10,
  },
]

export function computeAchievements(store) {
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(store) }))
}

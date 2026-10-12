const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return toDateStr(d)
}

function getLast(n) {
  return Array.from({ length: n }, (_, i) => daysAgo(i))
}

export function computeInsights(store) {
  const { habits, completions, taskCompletions, goals } = store
  const insights = []

  if (!habits.length) return insights

  const todayStr = toDateStr(new Date())
  const last7    = getLast(7)
  const prev7    = Array.from({ length: 7 }, (_, i) => daysAgo(7 + i))
  const last30   = getLast(30)

  // ── 1. Day-of-week pattern (last 90 days) ────────────────────────────────────
  const dowStats = Array.from({ length: 7 }, () => ({ done: 0, days: 0 }))
  for (let i = 0; i < 90; i++) {
    const ds  = daysAgo(i)
    if (ds === todayStr) continue  // skip today (incomplete day)
    const dow  = new Date(ds + 'T00:00:00').getDay()
    const done = completions.filter(c => c.date === ds).length
    dowStats[dow].done += done
    dowStats[dow].days++
  }

  const dowRates = dowStats
    .map((s, dow) => ({
      dow,
      rate: s.days >= 4 ? Math.round((s.done / (s.days * habits.length)) * 100) : null,
    }))
    .filter(s => s.rate !== null)

  if (dowRates.length >= 3) {
    const best  = dowRates.reduce((a, b) => a.rate > b.rate ? a : b)
    const worst = dowRates.reduce((a, b) => a.rate < b.rate ? a : b)

    if (best.rate >= 60) {
      insights.push({
        id: 'best_day', icon: 'TrendingUp', type: 'positive',
        text: `${DAY_NAMES[best.dow]} is your strongest day`,
        sub:  `${best.rate}% average completion`,
      })
    }

    if (worst.rate < 55 && worst.dow !== best.dow) {
      insights.push({
        id: 'weak_day', icon: 'AlertCircle', type: 'warning',
        text: `${DAY_NAMES[worst.dow]}s are your toughest`,
        sub:  `${worst.rate}% average — plan ahead for this day`,
      })
    }
  }

  // ── 2. Week-over-week trend ───────────────────────────────────────────────────
  const thisWkDone = last7.filter(d => d !== todayStr)
    .reduce((s, d) => s + completions.filter(c => c.date === d).length, 0)
  const prevWkDone = prev7
    .reduce((s, d) => s + completions.filter(c => c.date === d).length, 0)

  const thisWkDays = last7.filter(d => d !== todayStr).length
  const thisWkRate = thisWkDays && habits.length
    ? Math.round((thisWkDone / (habits.length * thisWkDays)) * 100) : 0
  const prevWkRate = habits.length
    ? Math.round((prevWkDone / (habits.length * 7)) * 100) : 0

  if (prevWkRate > 0) {
    const diff = thisWkRate - prevWkRate
    if (diff >= 10) {
      insights.push({
        id: 'trend_up', icon: 'TrendingUp', type: 'positive',
        text: 'You\'re on an upward trend',
        sub:  `Up ${diff}% vs last week — momentum is building`,
      })
    } else if (diff <= -15) {
      insights.push({
        id: 'trend_down', icon: 'TrendingDown', type: 'warning',
        text: 'Consistency dipped this week',
        sub:  `Down ${Math.abs(diff)}% vs last week — time to refocus`,
      })
    }
  }

  // ── 3. Per-routine rates (last 30 days) ──────────────────────────────────────
  const habitRates = habits.map(h => {
    const done = last30.filter(d => completions.some(c => c.habit_id === h.id && c.date === d)).length
    return { habit: h, rate: Math.round((done / 30) * 100) }
  })

  if (habitRates.length) {
    const best = habitRates.reduce((a, b) => a.rate > b.rate ? a : b)
    if (best.rate >= 70) {
      insights.push({
        id: 'best_habit', icon: 'Star', type: 'positive',
        text: `"${best.habit.name}" is rock solid`,
        sub:  `${best.rate}% completion over 30 days`,
      })
    }

    if (habitRates.length > 1) {
      const weak = habitRates.reduce((a, b) => a.rate < b.rate ? a : b)
      if (weak.rate < 40) {
        insights.push({
          id: 'weak_habit', icon: 'AlertCircle', type: 'warning',
          text: `"${weak.habit.name}" needs attention`,
          sub:  `Only ${weak.rate}% over 30 days — consider adjusting it`,
        })
      }
    }
  }

  // ── 4. Consecutive active days (momentum) ────────────────────────────────────
  let momentum = 0
  for (let i = 1; i <= 60; i++) {
    const ds = daysAgo(i)
    if (completions.some(c => c.date === ds)) momentum++
    else break
  }
  if (momentum >= 3) {
    insights.push({
      id: 'momentum', icon: 'Flame', type: 'positive',
      text: `${momentum}-day active streak`,
      sub:  momentum >= 14 ? 'Exceptional consistency — you\'re in the zone'
          : momentum >= 7  ? 'A full week of showing up — keep it going'
          :                  'Building real momentum — don\'t break the chain',
    })
  }

  // ── 5. Total completions milestone ───────────────────────────────────────────
  const total      = completions.length
  const milestones = [10, 25, 50, 100, 250, 500, 1000]
  const reached    = milestones.filter(m => total >= m).pop()
  if (reached) {
    const next = milestones.find(m => m > total)
    insights.push({
      id: 'milestone', icon: 'Award', type: 'positive',
      text: `${total.toLocaleString()} total completions`,
      sub:  next ? `${next - total} away from ${next}` : 'Elite level consistency',
    })
  }

  // ── 6. Perfect days ──────────────────────────────────────────────────────────
  const perfectDays = last30.filter(d => {
    if (d === todayStr) return false
    const done = completions.filter(c => c.date === d).length
    return done >= habits.length && habits.length > 0
  }).length

  if (perfectDays >= 5) {
    insights.push({
      id: 'perfect_days', icon: 'CheckCircle', type: 'positive',
      text: `${perfectDays} perfect days this month`,
      sub:  `You completed everything ${perfectDays} times in the last 30 days`,
    })
  }

  // ── 7. Goal nearing deadline ─────────────────────────────────────────────────
  goals
    .filter(g => !g.completed && g.target_date && (g.progress ?? 0) >= 40)
    .forEach(g => {
      const daysLeft = Math.ceil((new Date(g.target_date) - new Date()) / 86400000)
      if (daysLeft > 0 && daysLeft <= 14) {
        insights.push({
          id:   `goal_close_${g.id}`, icon: 'Target', type: 'warning',
          text: `"${g.title}" deadline approaching`,
          sub:  `${g.progress}% done · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
        })
      } else if (daysLeft > 14 && (g.progress ?? 0) >= 75) {
        insights.push({
          id:   `goal_close_${g.id}`, icon: 'Target', type: 'positive',
          text: `"${g.title}" almost there`,
          sub:  `${g.progress}% complete`,
        })
      }
    })

  // ── 8. Gap detection ─────────────────────────────────────────────────────────
  const gaps = detectGaps(habits, goals)

  // Smart ordering: momentum first → 1 gap → other positives → warnings → 2nd gap
  const positive       = insights.filter(i => i.type === 'positive')
  const warnings       = insights.filter(i => i.type === 'warning')
  const momentumItem   = positive.find(i => i.id === 'momentum')
  const rest           = positive.filter(i => i.id !== 'momentum')

  const ordered = [
    ...(momentumItem    ? [momentumItem] : []),
    ...(gaps.length     ? [gaps[0]]      : []),
    ...rest,
    ...warnings,
    ...(gaps.length > 1 ? [gaps[1]]      : []),
  ]

  return ordered.slice(0, 5)
}

// ── Gap detection ─────────────────────────────────────────────────────────────

function detectGaps(habits, goals) {
  if (habits.length < 1) return []

  const joined     = habits.map(h => h.name.toLowerCase()).join(' ')
  const goalJoined = goals.map(g => g.title.toLowerCase()).join(' ')
  const gaps       = []

  const has = pattern => pattern.test(joined)

  const hasPhysical    = has(/workout|exercise|run|gym|walk|yoga|stretch|fitness|train|lift|swim|cycl|bike|sport|hiit|cardio|weights|steps/)
  const hasMindful     = has(/meditat|journal|breath|gratitude|reflect|mindful|pray|prayer|stoic|reading.*mind|morning.*pages/)
  const hasSleep       = has(/sleep|wind.?down|bed.?time|evening|night.?routine|recovery|relax|unwind/)
  const hasLearning    = has(/read|book|learn|study|cours|podcast|skill|language|practice|write|writing/)
  const hasHydration   = has(/water|hydrat|drink/)
  const hasNutrition   = has(/eat|meal|diet|nutrition|cook|food|vitamins|supplements/)

  // Physical movement
  if (!hasPhysical) {
    gaps.push({
      id: 'gap_physical', icon: 'Activity', type: 'coaching',
      text: 'No physical routine detected',
      sub:  'Movement drives energy, focus, and mood — even a daily walk is a game-changer',
    })
  }

  // Mind / reflection
  if (!hasMindful && habits.length >= 2) {
    gaps.push({
      id: 'gap_mindful', icon: 'Brain', type: 'coaching',
      text: 'No mindfulness or reflection habit',
      sub:  '5 minutes of journaling or meditation daily builds significant mental clarity over time',
    })
  }

  // Sleep / wind-down
  if (!hasSleep && habits.length >= 3) {
    gaps.push({
      id: 'gap_sleep', icon: 'Moon', type: 'coaching',
      text: 'No wind-down routine',
      sub:  'A consistent evening routine is one of the highest-leverage habits you can build',
    })
  }

  // Learning
  if (!hasLearning && habits.length >= 2) {
    gaps.push({
      id: 'gap_learning', icon: 'BookOpen', type: 'coaching',
      text: 'No learning habit',
      sub:  '15 minutes of reading daily becomes 20+ books a year — it compounds fast',
    })
  }

  // Hydration (only suggest if they have enough other habits)
  if (!hasHydration && habits.length >= 4) {
    gaps.push({
      id: 'gap_hydration', icon: 'Droplets', type: 'coaching',
      text: 'No hydration habit',
      sub:  'Tracking daily water intake is a small habit with an outsized impact on energy',
    })
  }

  // Goal without a matching routine
  const hasFitnessGoal  = /fitness|weight|run|gym|health|body|physic|cardio|strength/.test(goalJoined)
  const hasLearningGoal = /read|book|learn|study|language|skill|cours/.test(goalJoined)

  if (hasFitnessGoal && !hasPhysical) {
    gaps.push({
      id: 'gap_goal_fitness', icon: 'AlertCircle', type: 'coaching',
      text: 'Fitness goal with no physical routine',
      sub:  'Goals need daily actions — add a movement routine to make this one happen',
    })
  }

  if (hasLearningGoal && !hasLearning) {
    gaps.push({
      id: 'gap_goal_learning', icon: 'AlertCircle', type: 'coaching',
      text: 'Learning goal with no learning routine',
      sub:  'Add a daily reading or study habit to turn this goal into action',
    })
  }

  // Balance check — all habits are the same category
  const allPhysical = hasPhysical && !hasMindful && !hasSleep && !hasLearning && habits.length >= 3
  if (allPhysical) {
    gaps.push({
      id: 'gap_balance', icon: 'Brain', type: 'coaching',
      text: 'Your routines are all physical',
      sub:  'Balance body with mind — adding a reflection or learning habit rounds out your system',
    })
  }

  return gaps.slice(0, 2)
}

import { Capacitor } from '@capacitor/core'

function getPlugin() {
  if (!Capacitor.isNativePlatform()) return null
  return Capacitor.Plugins.NotificationPlugin ?? null
}

function fmt(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function postToNative(payload) {
  try {
    window.webkit?.messageHandlers?.notificationScheduler?.postMessage(payload)
  } catch { /* not on iOS */ }
}

export function scheduleReminders({ dailyEnabled, dailyHour, dailyMinute, streakEnabled, streakHour, streakMinute }) {
  postToNative({
    dailyEnabled,  dailyTime:  fmt(dailyHour,  dailyMinute),
    streakEnabled, streakTime: fmt(streakHour, streakMinute),
  })
}

export function cancelReminders() {
  postToNative({ dailyEnabled: false, dailyTime: '08:00', streakEnabled: false, streakTime: '21:00' })
}

export function loadReminderPrefs() {
  const enabled       = localStorage.getItem('daily_reminder_enabled') === 'true'
  const time          = localStorage.getItem('daily_reminder_time') || '08:00'
  const streakEnabled = localStorage.getItem('streak_reminder_enabled') === 'true'
  const streakTime    = localStorage.getItem('streak_reminder_time') || '21:00'
  return { enabled, time, streakEnabled, streakTime }
}

export function saveReminderPrefs(enabled, time, streakEnabled, streakTime) {
  localStorage.setItem('daily_reminder_enabled', String(enabled))
  localStorage.setItem('daily_reminder_time', time)
  localStorage.setItem('streak_reminder_enabled', String(streakEnabled))
  localStorage.setItem('streak_reminder_time', streakTime)
}

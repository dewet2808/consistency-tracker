import { useState, useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { useAuth } from './AuthContext'
import { useStore } from './useStore'
import { supabase } from './supabase'
import { initPurchases, checkProEntitlement, checkProEntitlementWeb, isNativeIOS } from './purchases'
import { loadReminderPrefs, scheduleReminders, cancelReminders } from './notifications'
import Paywall from './components/Paywall'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import Habits from './pages/Habits'
import Tasks from './pages/Tasks'
import CalendarPage from './pages/Calendar'
import Goals from './pages/Goals'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import Toast from './components/Toast'
import ThemePicker from './components/ThemePicker'
import ReminderSettings from './components/ReminderSettings'
import ProfileSheet from './components/ProfileSheet'
import { CalendarCheck, Flame, CheckSquare, CalendarDays, Target, BarChart3 } from 'lucide-react'
import LogoMark from './components/LogoMark'
import './App.css'

const TABS = [
  { id: 'today',     label: 'Today',    Icon: CalendarCheck },
  { id: 'habits',    label: 'Routines', Icon: Flame         },
  { id: 'tasks',     label: 'Tasks',    Icon: CheckSquare   },
  { id: 'calendar',  label: 'Calendar', Icon: CalendarDays  },
  { id: 'goals',     label: 'Goals',    Icon: Target        },
  { id: 'dashboard', label: 'Progress', Icon: BarChart3     },
]

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('ct_theme') || 'dark')
  const [color, setColor] = useState(() => localStorage.getItem('ct_color') || 'blue')

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('ct_theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-color', color)
    localStorage.setItem('ct_color', color)
  }, [color])

  function toggle() { setTheme(t => t === 'dark' ? 'light' : 'dark') }
  return { theme, color, toggle, setColor }
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [tab, setTab]       = useState('today')
  const [mountedTabs, setMountedTabs] = useState(() => new Set(['today']))
  const [toast, setToast]       = useState(null)
  const [isPro, setIsPro]             = useState(import.meta.env.DEV && !isNativeIOS())
  const [showPaywall, setShowPaywall] = useState(false)
  const [onboarded, setOnboarded]     = useState(() => !!localStorage.getItem('daily_onboarded'))
  const { theme, color, toggle: toggleTheme, setColor } = useTheme()
  const store = useStore(user)

  // Subscription check — RevenueCat SDK on iOS, REST API on web
  useEffect(() => {
    if (!user) return
    if (isNativeIOS()) {
      initPurchases(user.id).then(() => checkProEntitlement().then(ok => setIsPro(ok)))
    } else {
      checkProEntitlementWeb(supabase).then(ok => setIsPro(ok))
    }
  }, [user])

  // Re-schedule reminders on app start if enabled
  useEffect(() => {
    if (!user || !isNativeIOS()) return
    const { enabled, time, streakEnabled, streakTime } = loadReminderPrefs()
    const [dh, dm] = time.split(':').map(Number)
    const [sh, sm] = streakTime.split(':').map(Number)
    if (enabled || streakEnabled) {
      scheduleReminders({ dailyEnabled: enabled, dailyHour: dh, dailyMinute: dm, streakEnabled, streakHour: sh, streakMinute: sm })
    }
  }, [user])

  // Cancel streak reminder when all today's habits are done
  useEffect(() => {
    if (!user || !isNativeIOS() || store.loadingData) return
    if (!store.habits.length) return
    const { enabled, time, streakEnabled, streakTime } = loadReminderPrefs()
    if (!streakEnabled) return
    const todayStr = new Date().toISOString().slice(0, 10)
    const allDone = store.habits.every(h => store.isCompleted(h.id, todayStr))
    if (allDone) {
      const [dh, dm] = time.split(':').map(Number)
      const [sh, sm] = streakTime.split(':').map(Number)
      scheduleReminders({ dailyEnabled: enabled, dailyHour: dh, dailyMinute: dm, streakEnabled: false, streakHour: sh, streakMinute: sm })
    }
  }, [user, store.completions, store.habits, store.loadingData])

  // Handle deep links for email verification / magic links
  useEffect(() => {
    if (!isNativeIOS()) return
    const listener = CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith('com.dewet.daily://')) return
      const urlObj = new URL(url.replace('com.dewet.daily://', 'https://placeholder/'))
      const code = urlObj.searchParams.get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      } else {
        const hash = urlObj.hash.substring(1)
        const params = new URLSearchParams(hash)
        const access_token  = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }
      }
    })
    return () => { listener.then(l => l.remove()) }
  }, [])

  function showToast(msg) { setToast(msg) }

  function switchTab(id) {
    setTab(id)
    setMountedTabs(prev => new Set([...prev, id]))
  }

  if (authLoading) {
    return (
      <div className="splash">
        <LogoMark size={52} />
      <div className="splash-wordmark">Daily</div>
      </div>
    )
  }

  if (!user) return <Auth />

  if (store.loadingData) {
    return (
      <div className="splash">
        <LogoMark size={52} />
      <div className="splash-wordmark">Daily</div>
        <div className="splash-text">Loading…</div>
      </div>
    )
  }

  if (!onboarded) {
    return (
      <Onboarding onDone={() => {
        localStorage.setItem('daily_onboarded', '1')
        setOnboarded(true)
      }} />
    )
  }

  const PAGE_COMPONENTS = {
    today:     <Today store={store} onToast={showToast} />,
    habits:    <Habits store={store} onToast={showToast} isPro={isPro} onShowPaywall={() => setShowPaywall(true)} />,
    tasks:     <Tasks store={store} onToast={showToast} />,
    calendar:  <CalendarPage store={store} />,
    goals:     <Goals store={store} onToast={showToast} isPro={isPro} onShowPaywall={() => setShowPaywall(true)} />,
    dashboard: <Dashboard store={store} isPro={isPro} onShowPaywall={() => setShowPaywall(true)} />,
  }

  return (
    <div className="app">
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <LogoMark size={20} />
          <span className="sidebar-wordmark">Daily</span>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`sidebar-nav-btn${tab === id ? ' active' : ''}`}
              onClick={() => switchTab(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ThemePicker
            theme={theme}
            color={color}
            onToggleTheme={toggleTheme}
            onSetColor={setColor}
          />
          <ProfileSheet user={user} onSignOut={signOut} store={store} />
        </div>
      </aside>

      <div className="app-body">
        <header className="app-header">
          <div className="app-header-inner">
            <span className="app-logo-text">
              <LogoMark size={18} />Daily
            </span>

            <nav className="app-nav">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`nav-btn${tab === id ? ' active' : ''}`}
                  onClick={() => switchTab(id)}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <div className="header-right">
              {isNativeIOS() && <ReminderSettings />}
              <ThemePicker
                theme={theme}
                color={color}
                onToggleTheme={toggleTheme}
                onSetColor={setColor}
              />
              <ProfileSheet user={user} onSignOut={signOut} store={store} />
            </div>
          </div>
        </header>

        <main className="app-main">
          {TABS.map(({ id }) => mountedTabs.has(id) && (
            <div key={id} className="page-view" style={{ display: tab === id ? undefined : 'none' }}>
              {PAGE_COMPONENTS[id]}
            </div>
          ))}
        </main>

        <nav className="bottom-nav">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`bottom-nav-btn${tab === id ? ' active' : ''}`}
              onClick={() => switchTab(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {toast && <Toast message={toast} onDone={() => setToast(null)} />}

        {showPaywall && (
          <Paywall
            onClose={() => setShowPaywall(false)}
            onPurchased={() => { setIsPro(true); setShowPaywall(false) }}
          />
        )}
      </div>
    </div>
  )
}

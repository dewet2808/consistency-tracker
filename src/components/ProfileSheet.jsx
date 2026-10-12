import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, LogOut, Trash2, UserCircle2, Lock,
  Play, Flame, Shield, Star, Award, CheckSquare, Target,
  Calendar, CalendarCheck, Layers, Medal, Crown, Trophy,
  Users, Copy, Check, Search,
} from 'lucide-react'
import { supabase } from '../supabase'
import { computeXP, computeAchievements } from '../utils/gamification'
import './ProfileSheet.css'

const ACHIEVEMENT_ICONS = {
  Play, Flame, Shield, Star, Award, CheckSquare, Target,
  Calendar, CalendarCheck, Layers, Medal, Crown, Trophy,
}

function AchievementIcon({ name, size = 16 }) {
  const Icon = ACHIEVEMENT_ICONS[name]
  return Icon ? <Icon size={size} /> : null
}

function buildSnapshot(store, xpData) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const last7days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10)
  })
  const daysBack = last7days.filter(d => d !== todayStr)
  const totalPossible = daysBack.length * store.habits.length
  const totalDone = daysBack.reduce(
    (s, d) => s + store.completions.filter(c => c.date === d).length, 0
  )
  const weeklyRate = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0
  const bestStreak = store.habits.length
    ? Math.max(0, ...store.habits.map(h => store.getStreak(h.id)))
    : 0
  return {
    streak: bestStreak,
    weeklyRate,
    last7: last7days.map(d => store.completions.some(c => c.date === d)),
    totalCompletions: store.completions.length,
    goalsActive: store.goals.filter(g => !g.completed).length,
    level: xpData?.level ?? 1,
    levelName: xpData?.levelName ?? 'Beginner',
    habitCount: store.habits.length,
  }
}

function PartnerStatsCard({ stats, updatedAt }) {
  const last7 = stats.last7 ?? []
  const updated = updatedAt
    ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  return (
    <div className="partner-stats-card">
      <div className="partner-stats-top">
        <div className="partner-level-row">
          <span className="partner-level-badge">Lv {stats.level}</span>
          <span className="partner-level-name">{stats.levelName}</span>
        </div>
        {updated && <span className="partner-updated">Updated {updated}</span>}
      </div>
      <div className="partner-stat-grid">
        <div className="partner-stat">
          <div className="partner-stat-val">{stats.streak ?? 0}</div>
          <div className="partner-stat-lbl">Streak</div>
        </div>
        <div className="partner-stat">
          <div className="partner-stat-val">{stats.weeklyRate ?? 0}%</div>
          <div className="partner-stat-lbl">This week</div>
        </div>
        <div className="partner-stat">
          <div className="partner-stat-val">{stats.habitCount ?? 0}</div>
          <div className="partner-stat-lbl">Routines</div>
        </div>
        <div className="partner-stat">
          <div className="partner-stat-val">{stats.totalCompletions ?? 0}</div>
          <div className="partner-stat-lbl">All-time</div>
        </div>
      </div>
      {last7.length > 0 && (
        <div className="partner-last7">
          {last7.map((done, i) => (
            <div key={i} className={`partner-dot${done ? ' done' : ''}`} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProfileSheet({ user, onSignOut, store }) {
  const [open, setOpen]             = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState(null)

  // Partner state
  const [partnerTab, setPartnerTab]           = useState('share')
  const [shareCode, setShareCode]             = useState(null)
  const [shareLoading, setShareLoading]       = useState(false)
  const [copied, setCopied]                   = useState(false)
  const [partnerInput, setPartnerInput]       = useState('')
  const [partnerStats, setPartnerStats]       = useState(null)
  const [partnerFetching, setPartnerFetching] = useState(false)
  const [partnerError, setPartnerError]       = useState(null)

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const xpData       = useMemo(() => store ? computeXP(store) : null, [store])
  const achievements = useMemo(() => store ? computeAchievements(store) : [], [store])
  const unlockedCount = achievements.filter(a => a.unlocked).length

  function openSheet()  { setOpen(true);  setConfirming(false); setDeleteInput(''); setError(null) }
  function closeSheet() { setOpen(false); setConfirming(false); setDeleteInput(''); setError(null) }

  // Load share code whenever the share tab is visible
  useEffect(() => {
    if (!open || partnerTab !== 'share' || shareCode || shareLoading || !store) return
    setShareLoading(true)
    const snapshot = buildSnapshot(store, xpData)
    store.ensureShareCode(snapshot)
      .then(({ data }) => { if (data?.code) setShareCode(data.code) })
      .finally(() => setShareLoading(false))
  }, [open, partnerTab, store, xpData, shareCode, shareLoading])

  async function handleCopyCode() {
    if (!shareCode) return
    try { await navigator.clipboard.writeText(shareCode) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleFetchPartner() {
    if (partnerInput.length !== 6) return
    setPartnerFetching(true)
    setPartnerError(null)
    setPartnerStats(null)
    const { data, error } = await store.getPartnerStats(partnerInput)
    if (error || !data?.stats) {
      setPartnerError('No partner found with that code. Check the code and try again.')
    } else {
      setPartnerStats({ ...data.stats, updatedAt: data.updated_at })
    }
    setPartnerFetching(false)
  }

  async function handleDelete() {
    if (deleteInput !== 'DELETE') return
    setDeleting(true)
    setError(null)
    const { error } = await supabase.rpc('delete_user')
    if (error) { setError('Something went wrong. Please try again.'); setDeleting(false); return }
    await supabase.auth.signOut()
    onSignOut()
  }

  return (
    <>
      <button className="icon-btn" onClick={openSheet} title="Profile">
        <UserCircle2 size={17} />
      </button>

      {open && createPortal(
        <div className="profile-overlay" onClick={e => { if (e.target === e.currentTarget) closeSheet() }}>
          <div className="profile-sheet">
            <div className="profile-sheet-handle" />

            <div className="profile-sheet-header">
              <span className="profile-sheet-title">Profile</span>
              <button className="icon-btn" onClick={closeSheet}><X size={16} /></button>
            </div>

            {/* User info */}
            <div className="profile-user-block">
              <div className="profile-avatar">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="profile-user-info">
                <div className="profile-email">{user?.email}</div>
                {joinedDate && <div className="profile-joined">Member since {joinedDate}</div>}
              </div>
            </div>

            {/* XP + Level */}
            {xpData && (
              <div className="profile-xp-block">
                <div className="profile-level-row">
                  <span className="profile-level-badge">Lv {xpData.level}</span>
                  <span className="profile-level-name">{xpData.levelName}</span>
                  <span className="profile-xp-total">{xpData.xp.toLocaleString()} XP</span>
                </div>
                <div className="profile-xp-bar-track">
                  <div
                    className="profile-xp-bar-fill"
                    style={{ width: `${xpData.pct}%` }}
                  />
                </div>
                <div className="profile-xp-sub">
                  {xpData.xpForNext
                    ? `${xpData.xpInLevel} / ${xpData.xpForNext} XP to Level ${xpData.level + 1}`
                    : 'Max level reached'}
                </div>
              </div>
            )}

            <div className="profile-divider" />

            {/* Achievements */}
            <div className="profile-achievements-block">
              <div className="profile-section-label">
                Achievements
                <span className="profile-achievements-count">{unlockedCount}/{achievements.length}</span>
              </div>
              <div className="profile-achievements-grid">
                {achievements.map(a => (
                  <div key={a.id} className={`profile-achievement${a.unlocked ? ' unlocked' : ''}`} title={a.desc}>
                    <span className="profile-achievement-icon"><AchievementIcon name={a.icon} size={16} /></span>
                    <span className="profile-achievement-name">{a.name}</span>
                    {!a.unlocked && <div className="profile-achievement-lock"><Lock size={10} /></div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-divider" />

            {/* Accountability Partner */}
            <div className="profile-partner-block">
              <div className="profile-section-label">
                <Users size={13} style={{ marginRight: 6 }} />
                Accountability Partner
              </div>

              <div className="profile-partner-tabs">
                <button
                  className={`profile-partner-tab${partnerTab === 'share' ? ' active' : ''}`}
                  onClick={() => setPartnerTab('share')}
                >Share progress</button>
                <button
                  className={`profile-partner-tab${partnerTab === 'follow' ? ' active' : ''}`}
                  onClick={() => { setPartnerTab('follow'); setPartnerStats(null); setPartnerError(null) }}
                >Follow partner</button>
              </div>

              {partnerTab === 'share' && (
                <div className="profile-partner-share">
                  {shareLoading && (
                    <div className="profile-partner-hint">Loading your code…</div>
                  )}
                  {!shareLoading && shareCode && (
                    <>
                      <div className="profile-code-row">
                        <span className="profile-code-text">{shareCode}</span>
                        <button className="profile-code-copy" onClick={handleCopyCode}>
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="profile-partner-hint">
                        Give this 6-character code to your accountability partner. They enter it in their app to see your progress.
                      </div>
                    </>
                  )}
                  {!shareLoading && !shareCode && (
                    <div className="profile-partner-hint">Setting up your code…</div>
                  )}
                </div>
              )}

              {partnerTab === 'follow' && (
                <div className="profile-partner-follow">
                  <div className="profile-partner-input-row">
                    <input
                      className="profile-partner-input"
                      placeholder="Enter 6-char code"
                      value={partnerInput}
                      onChange={e => { setPartnerInput(e.target.value.toUpperCase()); setPartnerError(null) }}
                      maxLength={6}
                      onKeyDown={e => e.key === 'Enter' && handleFetchPartner()}
                    />
                    <button
                      className="profile-partner-search-btn"
                      onClick={handleFetchPartner}
                      disabled={partnerInput.length !== 6 || partnerFetching}
                    >
                      {partnerFetching ? '…' : <Search size={14} />}
                    </button>
                  </div>
                  {partnerError && (
                    <div className="profile-partner-error">{partnerError}</div>
                  )}
                  {partnerStats && (
                    <PartnerStatsCard stats={partnerStats} updatedAt={partnerStats.updatedAt} />
                  )}
                </div>
              )}
            </div>

            <div className="profile-divider" />

            {/* Sign out */}
            {!confirming && (
              <button className="profile-action-btn" onClick={onSignOut}>
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            )}

            <div className="profile-divider" />

            {/* Delete */}
            {!confirming ? (
              <div className="profile-danger-zone">
                <div className="profile-danger-label">Danger zone</div>
                <button className="profile-delete-btn" onClick={() => setConfirming(true)}>
                  <Trash2 size={15} />
                  <span>Delete account</span>
                </button>
                <div className="profile-delete-note">
                  Permanently deletes your account and all data. This cannot be undone.
                </div>
              </div>
            ) : (
              <div className="profile-confirm-block">
                <div className="profile-confirm-title">Delete your account?</div>
                <div className="profile-confirm-desc">
                  All your habits, tasks, goals and history will be permanently deleted.
                  Type <strong>DELETE</strong> to confirm.
                </div>
                <input
                  className="profile-confirm-input"
                  placeholder="Type DELETE"
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  autoFocus
                />
                {error && <div className="profile-error">{error}</div>}
                <div className="profile-confirm-actions">
                  <button className="btn-ghost" onClick={() => { setConfirming(false); setDeleteInput('') }}>
                    Cancel
                  </button>
                  <button
                    className="btn-delete-confirm"
                    onClick={handleDelete}
                    disabled={deleteInput !== 'DELETE' || deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete forever'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      , document.body)}
    </>
  )
}

import { useState } from 'react'
import { Flame, CheckSquare, Target, BarChart3, ChevronRight } from 'lucide-react'
import LogoMark from '../components/LogoMark'
import './Onboarding.css'

const SLIDES = [
  {
    id: 'welcome',
    content: <WelcomeSlide />,
  },
  {
    id: 'features',
    content: <FeaturesSlide />,
  },
  {
    id: 'ready',
    content: <ReadySlide />,
  },
]

function WelcomeSlide() {
  return (
    <div className="ob-slide-inner ob-welcome">
      <div className="ob-logo">
        <LogoMark size={64} />
      </div>
      <div className="ob-wordmark">Daily</div>
      <div className="ob-headline">Your productivity, by design.</div>
      <div className="ob-sub">
        Set your intentions, build routines, hit your goals — and see yourself improve every single day.
      </div>
    </div>
  )
}

function FeaturesSlide() {
  const features = [
    { Icon: Flame,       label: 'Routines', desc: 'Build the behaviours that compound over time' },
    { Icon: CheckSquare, label: 'Tasks',    desc: 'Recurring and one-off work in one clean view' },
    { Icon: Target,      label: 'Goals',    desc: 'Define what matters and track your progress' },
    { Icon: BarChart3,   label: 'Progress', desc: 'Weekly scores and insights across everything' },
  ]
  return (
    <div className="ob-slide-inner ob-features">
      <div className="ob-headline">One app. Full picture.</div>
      <div className="ob-sub">Everything you need to perform at your best, every day.</div>
      <div className="ob-feature-grid">
        {features.map(({ Icon, label, desc }) => (
          <div key={label} className="ob-feature-card">
            <div className="ob-feature-icon">
              <Icon size={20} strokeWidth={2} />
            </div>
            <div className="ob-feature-label">{label}</div>
            <div className="ob-feature-desc">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReadySlide() {
  return (
    <div className="ob-slide-inner ob-ready">
      <div className="ob-ready-ring">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="var(--surface3)" strokeWidth="8" />
          <circle cx="48" cy="48" r="40" fill="none" stroke="var(--accent)" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * 0.15}`}
            transform="rotate(-90 48 48)"
          />
        </svg>
        <div className="ob-ready-pct">100%</div>
      </div>
      <div className="ob-headline">Let's build something great.</div>
      <div className="ob-sub">
        Start with one routine or goal. Consistency compounds — your future self will thank you.
      </div>
    </div>
  )
}

export default function Onboarding({ onDone }) {
  const [slide, setSlide] = useState(0)
  const isLast = slide === SLIDES.length - 1

  function next() {
    if (isLast) { onDone(); return }
    setSlide(s => s + 1)
  }

  return (
    <div className="ob-overlay">
      <div className="ob-container">

        {/* Skip */}
        {!isLast && (
          <button className="ob-skip" onClick={onDone}>Skip</button>
        )}

        {/* Slides */}
        <div className="ob-slides">
          {SLIDES.map(({ id, content }, i) => (
            <div
              key={id}
              className="ob-slide"
              style={{ transform: `translateX(${(i - slide) * 100}%)` }}
            >
              {content}
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="ob-dots">
          {SLIDES.map((_, i) => (
            <div key={i} className={`ob-dot${i === slide ? ' active' : ''}`} />
          ))}
        </div>

        {/* CTA */}
        <button className="ob-cta" onClick={next}>
          {isLast ? 'Get Started' : (
            <><span>Next</span><ChevronRight size={18} /></>
          )}
        </button>

      </div>
    </div>
  )
}

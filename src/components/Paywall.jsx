import { useState, useEffect } from 'react'
import { getAllPackages, purchasePackage, restorePurchases, isNativeIOS } from '../purchases'
import LogoMark from './LogoMark'
import './Paywall.css'

const FEATURES = [
  'Unlimited routines & goals',
  'Weekly productivity score',
  'XP, levels & achievements',
  'Full completion history',
]

const OPTIONS = [
  { key: 'monthly',  label: 'Monthly',  sublabel: 'Billed monthly',   badge: null            },
  { key: 'annual',   label: 'Yearly',   sublabel: '2 months free',    badge: 'Most Popular'  },
  { key: 'lifetime', label: 'Lifetime', sublabel: 'One-time payment', badge: 'Best Value'    },
]

function WebPaywall({ onClose }) {
  return (
    <div className="paywall-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="paywall-sheet">
        <button className="paywall-close icon-btn" onClick={onClose} aria-label="Close">✕</button>
        <div className="paywall-logo"><LogoMark size={44} /></div>
        <div className="paywall-title">Daily Pro</div>
        <div className="paywall-sub">Subscribe via the iOS app</div>
        <ul className="paywall-features">
          {FEATURES.map(f => (
            <li key={f}><span className="paywall-check">✓</span>{f}</li>
          ))}
        </ul>
        <p style={{ fontSize: '14px', textAlign: 'center', opacity: 0.6, margin: '0 0 20px', lineHeight: 1.5 }}>
          Open Daily on your iPhone or iPad to subscribe. Your data syncs automatically.
        </p>
        <button className="btn-primary paywall-cta" onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}

export default function Paywall({ onClose, onPurchased }) {
  if (!isNativeIOS()) return <WebPaywall onClose={onClose} />
  const [packages, setPackages] = useState({ monthly: null, annual: null, lifetime: null })
  const [selected, setSelected] = useState('annual')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    getAllPackages().then(pkgs => {
      setPackages(pkgs)
      // default to annual if available, else monthly
      if (!pkgs.annual && pkgs.monthly) setSelected('monthly')
    })
  }, [])

  function priceFor(key) {
    const pkg = packages[key]
    if (!pkg) return null
    return pkg.product.priceString
  }

  async function handlePurchase() {
    if (!isNativeIOS()) return
    const pkg = packages[selected]
    if (!pkg) return
    setLoading(true)
    setError(null)
    try {
      const ok = await purchasePackage(pkg)
      if (ok) onPurchased()
    } catch (e) {
      if (!e.message?.includes('cancelled')) {
        setError('Purchase failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore() {
    setLoading(true)
    setError(null)
    try {
      const ok = await restorePurchases()
      if (ok) onPurchased()
      else setError('No previous purchase found.')
    } catch {
      setError('Restore failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedPrice = priceFor(selected)
  const ctaLabel = () => {
    if (loading) return 'Processing…'
    if (!selectedPrice) return 'Continue'
    if (selected === 'monthly')  return `Continue — ${selectedPrice}/mo`
    if (selected === 'annual')   return `Continue — ${selectedPrice}/yr`
    if (selected === 'lifetime') return `Get Lifetime — ${selectedPrice}`
    return 'Continue'
  }

  return (
    <div className="paywall-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="paywall-sheet">
        <button className="paywall-close icon-btn" onClick={onClose} aria-label="Close">✕</button>

        <div className="paywall-logo">
          <LogoMark size={44} />
        </div>
        <div className="paywall-title">Daily Pro</div>
        <div className="paywall-sub">Unlock the full experience</div>

        <ul className="paywall-features">
          {FEATURES.map(f => (
            <li key={f}>
              <span className="paywall-check">✓</span>
              {f}
            </li>
          ))}
        </ul>

        <div className="paywall-options">
          {OPTIONS.map(({ key, label, sublabel, badge }) => {
            const price = priceFor(key)
            const isSelected = selected === key
            return (
              <button
                key={key}
                className={`paywall-option${isSelected ? ' selected' : ''}${!price ? ' unavailable' : ''}`}
                onClick={() => price && setSelected(key)}
                disabled={!price}
              >
                <div className="paywall-option-left">
                  <div className="paywall-option-name">{label}</div>
                  <div className="paywall-option-sub">{sublabel}</div>
                </div>
                <div className="paywall-option-right">
                  {badge && <span className="paywall-badge">{badge}</span>}
                  <div className="paywall-option-price">
                    {price ?? '—'}
                    {key === 'monthly' && price && <span className="paywall-option-unit">/mo</span>}
                    {key === 'annual'  && price && <span className="paywall-option-unit">/yr</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {error && <div className="paywall-error">{error}</div>}

        <button
          className="btn-primary paywall-cta"
          onClick={handlePurchase}
          disabled={loading || !isNativeIOS()}
        >
          {ctaLabel()}
        </button>

        <button className="paywall-restore" onClick={handleRestore} disabled={loading}>
          Restore previous purchase
        </button>

        <div className="paywall-legal">
          <a className="paywall-legal-link" href="https://dewet2808.github.io/daily-privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</a>
          <span className="paywall-legal-sep">·</span>
          <a className="paywall-legal-link" href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">Terms of Use</a>
        </div>
      </div>
    </div>
  )
}

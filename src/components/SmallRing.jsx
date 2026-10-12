import './SmallRing.css'

export default function SmallRing({ pct, done, total }) {
  const size   = 90
  const stroke = 8
  const radius = (size - stroke) / 2
  const circ   = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ

  return (
    <div className="small-ring-wrap">
      <svg width={size} height={size} className="small-ring-svg">
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--surface3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--accent)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="small-ring-inner">
        <div className="small-ring-pct">{pct}%</div>
        <div className="small-ring-sub">{done}/{total}</div>
      </div>
    </div>
  )
}

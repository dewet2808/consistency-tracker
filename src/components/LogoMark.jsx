export default function LogoMark({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="50" cy="50" r="36"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="179.1 47.1"
        transform="rotate(-90 50 50)"
      />
    </svg>
  )
}

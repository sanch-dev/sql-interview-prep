export default function DonutRing({ solved, total, size = 32, color = 'var(--accent)' }) {
  const pct  = total > 0 ? solved / total : 0
  const r    = size * 0.38
  const circ = 2 * Math.PI * r
  const cx   = size / 2
  const cy   = size / 2
  const sw   = size * 0.1
  const isDone = pct >= 1 && total > 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-muted)" strokeWidth={sw} />
      {pct > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={isDone ? 'var(--success)' : color}
          strokeWidth={sw}
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      )}
    </svg>
  )
}

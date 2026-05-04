export default function CircularViz({ size = 220, listening, speaking, idle }) {
  const cx = size / 2
  const rings = [
    { r: size * 0.38, dash: '60 20', dur: '3s', dir: 'CW', w: 1 },
    { r: size * 0.30, dash: '40 15', dur: '4.5s', dir: 'CCW', w: 1.5 },
    { r: size * 0.22, dash: '25 12', dur: '2.8s', dir: 'CW', w: 1 },
    { r: size * 0.16, dash: '18 8',  dur: '6s',   dir: 'CCW', w: 0.8 },
  ]

  const color = listening ? '#ff4060' : speaking ? '#00ff88' : '#00e5ff'
  const opacity = listening ? 0.9 : speaking ? 0.85 : idle ? 0.25 : 0.6

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
      <defs>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </radialGradient>
      </defs>

      {/* Outer glow ring */}
      <circle cx={cx} cy={cx} r={size * 0.42}
        fill="none" stroke={color} strokeWidth="0.5"
        strokeOpacity={opacity * 0.4}
        filter="url(#glow2)"
      />

      {/* Animated rings */}
      {rings.map((ring, i) => (
        <circle key={i}
          cx={cx} cy={cx} r={ring.r}
          fill="none" stroke={color}
          strokeWidth={ring.w}
          strokeOpacity={opacity - i * 0.08}
          strokeDasharray={ring.dash}
          style={{
            transformOrigin: `${cx}px ${cx}px`,
            animation: `spin${ring.dir} ${ring.dur} linear infinite`,
            filter: (listening || speaking) ? 'url(#glow2)' : 'none',
          }}
        />
      ))}

      {/* Tick marks */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2
        const r1 = size * 0.44, r2 = size * 0.46
        const x1 = cx + Math.cos(angle) * r1, y1 = cx + Math.sin(angle) * r1
        const x2 = cx + Math.cos(angle) * r2, y2 = cx + Math.sin(angle) * r2
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} />
      })}

      {/* Core circle */}
      <circle cx={cx} cy={cx} r={size * 0.07}
        fill={`url(#coreGrad)`}
        filter={(listening || speaking) ? 'url(#glow2)' : 'none'}
        style={{ transition: 'all 0.4s ease' }}
      />
      <circle cx={cx} cy={cx} r={size * 0.03}
        fill="white" fillOpacity={listening ? 1 : speaking ? 0.9 : 0.6}
        style={{ transition: 'all 0.4s' }}
      />

      {/* Wave bars when speaking */}
      {speaking && Array.from({ length: 5 }).map((_, i) => (
        <rect key={i}
          x={cx - 14 + i * 7} y={cx - 3}
          width={4} height={6} rx={2}
          fill={color} fillOpacity={0.9}
          style={{ animation: `waveBar 0.6s ${i * 0.1}s ease-in-out infinite`, transformOrigin: `${cx - 14 + i * 7 + 2}px ${cx}px` }}
        />
      ))}

      {/* Pulse ring when listening */}
      {listening && (
        <circle cx={cx} cy={cx} r={size * 0.1}
          fill="none" stroke="#ff4060" strokeWidth="2"
          style={{ animation: 'ripple 1.5s ease-out infinite' }}
        />
      )}
    </svg>
  )
}

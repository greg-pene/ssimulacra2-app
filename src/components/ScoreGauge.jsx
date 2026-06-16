import './ScoreGauge.css'

export default function ScoreGauge({ label, score, color, qualityLabel, qualityColor }) {
  const clamped = Math.max(0, Math.min(100, score))
  const radius = 80
  const stroke = 12
  const normalizedR = radius - stroke / 2
  const circumference = Math.PI * normalizedR
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="gauge-wrapper">
      <div className="gauge-label-top">{label}</div>
      <div className="gauge-container">
        <svg viewBox={`0 0 ${radius * 2} ${radius + stroke}`} className="gauge-svg">
          <path
            d={`M ${stroke / 2} ${radius} A ${normalizedR} ${normalizedR} 0 0 1 ${radius * 2 - stroke / 2} ${radius}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${stroke / 2} ${radius} A ${normalizedR} ${normalizedR} 0 0 1 ${radius * 2 - stroke / 2} ${radius}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color}88)` }}
          />
        </svg>
        <div className="gauge-center">
          <span className="gauge-score">{score.toFixed(1)}</span>
          <span className="gauge-max">/100</span>
        </div>
      </div>
      <div className="gauge-quality" style={{ color: qualityColor }}>
        {qualityLabel}
      </div>
    </div>
  )
}

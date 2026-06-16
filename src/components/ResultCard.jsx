import './ResultCard.css'

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function savingsPercent(original, compressed) {
  const o = parseInt(original)
  const c = parseInt(compressed)
  if (!o || !c || isNaN(o) || isNaN(c)) return null
  const pct = ((o - c) / o * 100)
  return pct
}

export default function ResultCard({ title, badge, badgeColor, url, fileSize, fileType, score, qualityLabel, qualityColor, originalSize, highlight }) {
  const savings = savingsPercent(originalSize, fileSize)

  return (
    <div className={`result-card${highlight ? ' result-card--winner' : ''}`}>
      {highlight && score !== null && (
        <div className="winner-ribbon">Best Quality</div>
      )}
      <div className="rc-header">
        <span className="rc-badge" style={{ background: badgeColor }}>{badge}</span>
        <span className="rc-title">{title}</span>
      </div>

      <div className="rc-preview">
        {url ? (
          <img src={url} alt={title} className="rc-img" />
        ) : (
          <div className="rc-img-placeholder" />
        )}
      </div>

      <div className="rc-metrics">
        {score !== null && (
          <div className="rc-metric">
            <span className="rc-metric-label">SSIMULACRA2 Score</span>
            <span className="rc-metric-value" style={{ color: qualityColor }}>
              {score.toFixed(2)}
            </span>
          </div>
        )}

        {score !== null && qualityLabel && (
          <div className="rc-metric">
            <span className="rc-metric-label">Quality</span>
            <span className="rc-quality-badge" style={{ color: qualityColor, borderColor: qualityColor + '44', background: qualityColor + '11' }}>
              {qualityLabel}
            </span>
          </div>
        )}

        <div className="rc-metric">
          <span className="rc-metric-label">File Type</span>
          <span className="rc-metric-value rc-metric-value--neutral">{fileType || '—'}</span>
        </div>

        <div className="rc-metric">
          <span className="rc-metric-label">File Size</span>
          <span className="rc-metric-value rc-metric-value--neutral">{formatBytes(fileSize)}</span>
        </div>

        {savings !== null && (
          <div className="rc-metric">
            <span className="rc-metric-label">Size Savings</span>
            <span className={`rc-metric-value ${savings > 0 ? 'rc-metric-value--good' : 'rc-metric-value--bad'}`}>
              {savings > 0 ? `−${savings.toFixed(1)}%` : `+${Math.abs(savings).toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import './ImageInput.css'

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function ImageInput({ label, badge, badgeColor, urlValue, onUrlChange, placeholder, result, isWinner, previewSrc, onThumbnailClick }) {
  const [blurPreview, setBlurPreview] = useState(null)
  const [previewError, setPreviewError] = useState(false)

  // When a fresh previewSrc arrives (after analysis), use it and clear any error
  useEffect(() => {
    if (previewSrc) {
      setPreviewError(false)
    }
  }, [previewSrc])

  function handleUrlBlur() {
    setPreviewError(false)
    setBlurPreview(urlValue || null)
  }

  // previewSrc (post-analysis, cache-busted) takes priority over blur-triggered preview
  const imgSrc = previewSrc || blurPreview
  const borderStyle = result && isWinner
    ? { borderColor: badgeColor, boxShadow: `0 0 0 1px ${badgeColor}33, 0 4px 24px ${badgeColor}22` }
    : {}

  return (
    <div className="image-input" style={borderStyle}>
      <div className="image-input-header">
        <span className="image-badge" style={{ background: badgeColor }}>{badge}</span>
        <span className="image-label">{label}</span>
        {result?.isWinner && (
          <span className="winner-chip" style={{ background: badgeColor + '22', color: badgeColor, borderColor: badgeColor + '55' }}>
            Best Quality
          </span>
        )}
      </div>

      <div
        className={`preview-box${onThumbnailClick ? ' preview-box--clickable' : ''}`}
        onClick={onThumbnailClick || undefined}
      >
        {imgSrc && !previewError ? (
          <img
            src={imgSrc}
            alt={label}
            className="preview-img"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="preview-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Preview</span>
          </div>
        )}
        {onThumbnailClick && imgSrc && !previewError && (
          <div className="preview-compare-hint">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M7 4l-4 6 4 6M13 4l4 6-4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Compare
          </div>
        )}
      </div>

      <div className="field-group">
        <label className="field-label">Image URL</label>
        <input
          className="field-input"
          type="url"
          value={urlValue}
          onChange={e => onUrlChange(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder={placeholder}
        />
      </div>

      {result && (
        <div className="result-metrics">
          <div className="rm-row">
            <span className="rm-label">File Type</span>
            <span className="rm-value">{result.fileType || '—'}</span>
          </div>
          <div className="rm-row">
            <span className="rm-label">Resolution</span>
            <span className="rm-value">
              {result.resolution ? `${result.resolution.width} × ${result.resolution.height}` : '—'}
            </span>
          </div>
          <div className="rm-row">
            <span className="rm-label">File Size</span>
            <span className="rm-value">{formatBytes(result.fileSize)}</span>
          </div>
          {result.score != null && (
            <div className="rm-row">
              <span className="rm-label">SSIMULACRA2</span>
              <span className="rm-score" style={{ color: result.color }}>{result.score.toFixed(2)}</span>
            </div>
          )}
          {result.label && result.score != null && (
            <div className="rm-row">
              <span className="rm-label">Quality</span>
              <span className="rm-badge" style={{ color: result.color, borderColor: result.color + '44', background: result.color + '11' }}>
                {result.label}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

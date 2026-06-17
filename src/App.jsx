import { useState } from 'react'
import ImageInput from './components/ImageInput.jsx'
import ScoreGauge from './components/ScoreGauge.jsx'
import CompareModal from './components/CompareModal.jsx'
import './App.css'

const UA_OPTIONS = [
  {
    key: 'chrome',
    label: 'Chrome',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.9"/>
        <path d="M12 8h9.5M6.5 20L11 12M17.5 20L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      </svg>
    ),
  },
  {
    key: 'safari',
    label: 'Safari',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M16.5 7.5l-3 4.5-4.5 3 3-4.5 4.5-3z" fill="currentColor"/>
      </svg>
    ),
  },
]

export default function App() {
  const [urls, setUrls] = useState({ original: '', cloudinary: '', competitor: '' })
  const [userAgent, setUserAgent] = useState('chrome')
  const [results, setResults] = useState(null)
  const [previewUrls, setPreviewUrls] = useState({ original: null, cloudinary: null, competitor: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const setUrl = (key) => (val) => setUrls(u => ({ ...u, [key]: val }))

  async function analyze() {
    setError(null)
    setResults(null)
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl: urls.original,
          cloudinaryUrl: urls.cloudinary,
          competitorUrl: urls.competitor,
          userAgent,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      const bust = `_t=${Date.now()}`
      setPreviewUrls({
        original:   urls.original   + (urls.original.includes('?')   ? '&' : '?') + bust,
        cloudinary: urls.cloudinary + (urls.cloudinary.includes('?') ? '&' : '?') + bust,
        competitor: urls.competitor + (urls.competitor.includes('?') ? '&' : '?') + bust,
      })
      setResults(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = urls.original && urls.cloudinary && urls.competitor && !loading

  const [compareOpen, setCompareOpen] = useState(false)
  const cloudinaryWinner = results && results.cloudinary.score >= results.competitor.score
  const competitorWinner = results && results.competitor.score > results.cloudinary.score

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-row">
            <img src="https://res.cloudinary.com/cloudinary/image/upload/c_scale,w_120/v1/logo/for_white_bg/cloudinary_logo_for_white_bg.png" alt="Cloudinary" className="cloudinary-logo" />
            <span className="header-divider" />
            <h1>SSIMULACRA2 <span className="header-sub">Quality Analyzer</span></h1>
          </div>
          <p className="header-desc">Compare perceptual quality of optimized images against the original using the SSIMULACRA2 metric.</p>
        </div>
      </header>

      <main className="main">
        <section className="input-section">
          <div className="toolbar">
            <span className="toolbar-label">User Agent</span>
            <div className="ua-toggle">
              {UA_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  className={`ua-btn${userAgent === opt.key ? ' ua-btn--active' : ''}`}
                  onClick={() => setUserAgent(opt.key)}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="input-grid">
            <ImageInput
              label="Original Image"
              badge="SOURCE"
              badgeColor="#64748b"
              urlValue={urls.original}
              onUrlChange={setUrl('original')}
              placeholder="https://example.com/original.jpg"
              result={results ? { ...results.original } : null}
              previewSrc={previewUrls.original}
              onThumbnailClick={results ? () => setCompareOpen(true) : null}
            />
            <ImageInput
              label="Cloudinary Optimized"
              badge="CLOUDINARY"
              badgeColor="#3b82f6"
              urlValue={urls.cloudinary}
              onUrlChange={setUrl('cloudinary')}
              placeholder="https://res.cloudinary.com/…"
              result={results ? { ...results.cloudinary, isWinner: cloudinaryWinner } : null}
              isWinner={cloudinaryWinner}
              previewSrc={previewUrls.cloudinary}
              onThumbnailClick={results ? () => setCompareOpen(true) : null}
            />
            <ImageInput
              label="Competitor Optimized"
              badge="COMPETITOR"
              badgeColor="#8b5cf6"
              urlValue={urls.competitor}
              onUrlChange={setUrl('competitor')}
              placeholder="https://competitor.com/optimized.jpg"
              result={results ? { ...results.competitor, isWinner: competitorWinner } : null}
              isWinner={competitorWinner}
              previewSrc={previewUrls.competitor}
              onThumbnailClick={results ? () => setCompareOpen(true) : null}
            />
          </div>

          <div className="action-row">
            <button className="btn-analyze" onClick={analyze} disabled={!canSubmit}>
              {loading ? (
                <><span className="spinner" /> Analyzing…</>
              ) : (
                'Run SSIMULACRA2 Analysis'
              )}
            </button>
          </div>

          {error && <div className="error-box"><span>⚠</span> {error}</div>}
        </section>

        {results && (
          <section className="results-section">
            <h2 className="results-title">Analysis Results</h2>

            <div className="gauges-row">
              <ScoreGauge
                label="Cloudinary"
                score={results.cloudinary.score}
                color="#3b82f6"
                qualityLabel={results.cloudinary.label}
                qualityColor={results.cloudinary.color}
              />
              <ScoreGauge
                label="Competitor"
                score={results.competitor.score}
                color="#8b5cf6"
                qualityLabel={results.competitor.label}
                qualityColor={results.competitor.color}
              />
            </div>

            <div className="score-legend">
              <h3>Score Reference</h3>
              <div className="legend-items">
                {[
                  { range: '90–100', label: 'Visually Lossless', color: '#22c55e' },
                  { range: '80–90', label: 'Very High Quality', color: '#86efac' },
                  { range: '70–80', label: 'High Quality', color: '#bef264' },
                  { range: '50–70', label: 'Medium Quality', color: '#fbbf24' },
                  { range: '30–50', label: 'Low Quality', color: '#f97316' },
                  { range: '< 30', label: 'Very Low Quality', color: '#ef4444' },
                ].map(item => (
                  <div key={item.range} className="legend-item">
                    <span className="legend-dot" style={{ background: item.color }} />
                    <span className="legend-range">{item.range}</span>
                    <span className="legend-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {compareOpen && results && (
        <CompareModal
          cloudinaryUrl={previewUrls.cloudinary || urls.cloudinary}
          competitorUrl={previewUrls.competitor || urls.competitor}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  )
}

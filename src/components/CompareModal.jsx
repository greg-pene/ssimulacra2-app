import { useState, useRef, useCallback, useEffect } from 'react'
import './CompareModal.css'

export default function CompareModal({ cloudinaryUrl, competitorUrl, onClose }) {
  const [position, setPosition] = useState(50) // percent
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef(null)

  const updatePosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    setPosition(pct)
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!dragging) return
    updatePosition(e.clientX)
  }, [dragging, updatePosition])

  const onTouchMove = useCallback((e) => {
    if (!dragging) return
    updatePosition(e.touches[0].clientX)
  }, [dragging, updatePosition])

  const stopDrag = useCallback(() => setDragging(false), [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', stopDrag)
      window.addEventListener('touchmove', onTouchMove, { passive: true })
      window.addEventListener('touchend', stopDrag)
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopDrag)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', stopDrag)
    }
  }, [dragging, onMouseMove, onTouchMove, stopDrag])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="compare-overlay" onClick={onClose}>
      <div className="compare-modal" onClick={e => e.stopPropagation()}>

        <button className="compare-close" onClick={onClose}>✕</button>

        <div className="compare-labels">
          <span className="compare-label compare-label--left">CLOUDINARY</span>
          <span className="compare-label compare-label--right">COMPETITOR</span>
        </div>

        <div
          className="compare-container"
          ref={containerRef}
          style={{ cursor: dragging ? 'col-resize' : 'ew-resize' }}
          onMouseDown={e => { e.preventDefault(); setDragging(true); updatePosition(e.clientX) }}
          onTouchStart={e => { setDragging(true); updatePosition(e.touches[0].clientX) }}
        >
          {/* Competitor — bottom layer (right side) */}
          <img src={competitorUrl} className="compare-img compare-img--right" alt="Competitor" draggable={false} />

          {/* Cloudinary — clipped to left of slider */}
          <div className="compare-clip" style={{ width: `${position}%` }}>
            <img src={cloudinaryUrl} className="compare-img compare-img--left" alt="Cloudinary" draggable={false} />
          </div>

          {/* Divider */}
          <div className="compare-divider" style={{ left: `${position}%` }}>
            <div className="compare-handle">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4l-4 6 4 6M13 4l4 6-4 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

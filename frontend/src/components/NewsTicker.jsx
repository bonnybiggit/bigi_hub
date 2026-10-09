import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import useLatestTicker from '../hooks/useLatestTicker.js'

function TickerItems({ items }) {
  return items.map((item, index) => (
    <span key={item.id} className="news-item">
      <Link to={item.to}><strong>{item.label}:</strong> {item.headline}</Link>
      {index < items.length - 1 && <span aria-hidden="true" className="news-separator"> | </span>}
    </span>
  ))
}

function NewsTicker() {
  const [paused, setPaused] = useState(false)
  const items = useLatestTicker()
  if (!items.length) return null
  return (
    <section className="news-ticker" aria-label="Latest News">
      <div className="news-label"><strong>Latest News</strong></div>
      <div className="news-window">
        <div className="news-track" style={{ animationPlayState: paused ? 'paused' : 'running' }}>
          <span className="news-group"><TickerItems items={items} /></span>
          <span className="news-group" aria-hidden="true" inert><TickerItems items={items} /></span>
        </div>
      </div>
      <button className="news-toggle" type="button" aria-label={paused ? 'Resume news ticker' : 'Pause news ticker'} aria-pressed={paused} onClick={() => setPaused((current) => !current)}>
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>
    </section>
  )
}

export default NewsTicker

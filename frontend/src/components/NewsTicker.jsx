import { useState } from 'react'
import { Pause, Play } from 'lucide-react'

function NewsTicker() {
  const [paused, setPaused] = useState(false)
  return (
    <section className="news-ticker" aria-label="Latest News - demo content">
      <div className="news-label"><strong>Latest News</strong><span>Demo content</span></div>
      <div className="news-window">
        <div className="news-track" style={{ animationPlayState: paused ? 'paused' : 'running' }}>
          <span>Demo headline · Lionel Messi leaves Argentina camp</span>
          <span aria-hidden="true">Demo headline · Lionel Messi leaves Argentina camp</span>
        </div>
      </div>
      <button className="news-toggle" type="button" aria-label={paused ? 'Resume news ticker' : 'Pause news ticker'} aria-pressed={paused} onClick={() => setPaused((current) => !current)}>
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>
    </section>
  )
}

export default NewsTicker

import { Link } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import '../styles/home.css'
import '../styles/public.css'

function NotFound() {
  return (
    <section className="public-not-found" aria-labelledby="not-found-title">
      <Compass size={36} aria-hidden="true" />
      <p className="home-eyebrow">404 · Page not found</p>
      <h1 id="not-found-title">Let’s get you back on track.</h1>
      <p>This page may have moved, or the link may be incorrect. Explore the latest listings or return to the homepage.</p>
      <div className="public-recovery-actions">
        <Link className="home-button home-button-primary" to="/">Back to home</Link>
        <Link className="home-button home-button-secondary" to="/opportunities">Explore opportunities <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
    </section>
  )
}

export default NotFound

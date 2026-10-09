import { NAVIGATION_CATEGORIES, listingPath } from '../config/contentCategories.js'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/footer.css'

function Footer() {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState(null)
  const emailInput = useRef(null)
  function submit(event) {
    event.preventDefault()
    const value = email.trim()
    if (!value || !emailInput.current.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFeedback({ error: true, message: 'Enter a valid email address, such as name@example.com.' })
      emailInput.current.focus()
      return
    }
    setFeedback({ error: false, message: 'Your email format is valid. Signup is coming soon; you have not been subscribed. Your email has not been sent or saved.' })
  }
  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        <div className="footer-brand"><Link className="site-brand" to="/">Bigi_Hub</Link><p>Discover jobs, scholarships and opportunities across Nigeria and Africa. Take your next step.</p></div>
        <nav className="footer-navigation" aria-label="Footer navigation">
          <div><h2>Explore</h2><ul>{NAVIGATION_CATEGORIES.map(category => <li key={category.id}><Link to={listingPath(category.id)}>{category.label}</Link></li>)}</ul></div>
          <div><h2>Site</h2><ul><li><Link to="/">Home</Link></li><li><Link to="/search">Search</Link></li></ul></div>
        </nav>
        <section className="footer-newsletter" aria-labelledby="footer-newsletter-title"><h2 id="footer-newsletter-title">Stay in the loop</h2><p>Updates on jobs, scholarships and opportunities.</p>
          <form noValidate onSubmit={submit}>
            <label htmlFor="footer-newsletter-email">Email address</label>
            <div className="footer-newsletter-fields"><input ref={emailInput} id="footer-newsletter-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} required value={email} aria-invalid={feedback?.error || undefined} aria-describedby="footer-newsletter-note footer-newsletter-feedback" onChange={event => { setEmail(event.target.value); setFeedback(null) }} placeholder="you@example.com" /><button type="submit">Join newsletter</button></div>
            <p id="footer-newsletter-note" className="footer-newsletter-note">Signup coming soon. This form checks your email only; it does not subscribe you.</p>
            <p id="footer-newsletter-feedback" className={'footer-newsletter-feedback' + (feedback?.error ? ' is-error' : '')} role={feedback?.error ? 'alert' : 'status'} aria-atomic="true">{feedback?.message}</p>
          </form>
        </section>
      </div>
      <p className="site-footer-copyright">© {new Date().getFullYear()} Bigi_Hub</p>
    </footer>
  )
}

export default Footer

import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

function Header() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 48rem)').matches)
  const [open, setOpen] = useState(false)
  const header = useRef(null)
  const toggle = useRef(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 48rem)')
    function resize(event) { setMobile(event.matches); setOpen(false) }
    media.addEventListener('change', resize)
    return () => media.removeEventListener('change', resize)
  }, [])
  useEffect(() => {
    if (!open) return
    function dismiss(event) {
      if (event.type === 'keydown' && event.key === 'Escape') { setOpen(false); toggle.current?.focus() }
      if (event.type === 'pointerdown' && !header.current?.contains(event.target)) setOpen(false)
      if (event.type === 'popstate') setOpen(false)
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('popstate', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('popstate', dismiss)
    }
  }, [open])
  return (
    <header className="site-header" ref={header}>
      <Link className="site-brand" to="/" onClick={() => setOpen(false)}>Bigi_Hub</Link>
      <button className="header-menu-toggle" type="button" ref={toggle} aria-controls="primary-navigation" aria-expanded={mobile && open} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setOpen((current) => !current)}>
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>
      <nav id="primary-navigation" className={'header-navigation' + (mobile && open ? ' is-open' : '')} aria-label="Main navigation" inert={mobile && !open} onClick={() => setOpen(false)}>
        <div className="header-menu-inner"><ul className="site-nav">
          <li><NavLink to="/" end>Home</NavLink></li>
          <li><NavLink to="/jobs" end>Jobs</NavLink></li>
          <li><NavLink to="/opportunities" end>Opportunities</NavLink></li>
          <li><NavLink to="/scholarships" end>Scholarships</NavLink></li>
        </ul></div>
      </nav>
    </header>
  )
}

export default Header

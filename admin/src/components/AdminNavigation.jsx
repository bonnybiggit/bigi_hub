import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAdminUI } from '../hooks/useAdminUI.js'
import { adminNavigationGroups } from '../utils/navigation.js'
export default function AdminNavigation() {
  const { menuOpen, setMenuOpen } = useAdminUI()
  useEffect(() => {
    function close(event) { if (event.key === 'Escape') { setMenuOpen(false); document.querySelector('.menu-toggle')?.focus() } }
    const media = window.matchMedia('(max-width: 48rem)')
    const resize = () => setMenuOpen(false)
    document.addEventListener('keydown', close)
    media.addEventListener('change', resize)
    return () => { document.removeEventListener('keydown', close); media.removeEventListener('change', resize) }
  }, [setMenuOpen])
  return <nav id="admin-navigation" className={'admin-navigation' + (menuOpen ? ' is-open' : '')} aria-label="Admin navigation">
    {adminNavigationGroups.map(group => <section className="nav-group" key={group.label} aria-labelledby={'nav-group-' + group.label.replace(/\W+/g, '-').toLowerCase()}>
      <p className="sidebar-label" id={'nav-group-' + group.label.replace(/\W+/g, '-').toLowerCase()}>{group.label}</p>
      <ul>{group.links.map(({ to, label }) => <li key={to}><NavLink to={to} end onClick={() => setMenuOpen(false)}>{label}</NavLink></li>)}</ul>
    </section>)}
    <p className="sidebar-note">Bigi_Hub administration</p></nav>
}

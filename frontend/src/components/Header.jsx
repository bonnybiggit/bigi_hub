import { Link, NavLink } from 'react-router-dom'

function Header() {
  return (
    <header className="site-header">
      <Link className="site-brand" to="/">Bigi_Hub</Link>
      <nav aria-label="Main navigation">
        <ul className="site-nav">
          <li><NavLink to="/" end>Home</NavLink></li>
          <li><NavLink to="/opportunities" end>Opportunities</NavLink></li>
          <li><NavLink to="/jobs" end>Jobs</NavLink></li>
          <li><NavLink to="/scholarships" end>Scholarships</NavLink></li>
        </ul>
      </nav>
    </header>
  )
}

export default Header

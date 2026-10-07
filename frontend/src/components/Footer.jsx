import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        <div><Link className="site-brand" to="/">Bigi_Hub</Link><p>Discover opportunities. Take your next step.</p></div>
        <nav aria-label="Footer navigation"><Link to="/jobs">Jobs</Link><Link to="/opportunities">Opportunities</Link><Link to="/scholarships">Scholarships</Link></nav>
      </div>
      <p className="site-footer-copyright">© {new Date().getFullYear()} Bigi_Hub</p>
    </footer>
  )
}

export default Footer

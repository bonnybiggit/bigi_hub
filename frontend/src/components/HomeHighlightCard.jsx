import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function HomeHighlightCard({ title, category, organization, location, section, to }) {
  return (
    <article className="home-card home-highlight-card">
      <span className="home-tag">{category}</span>
      <h3 title={title}>{title}</h3>
      <dl className="home-opportunity-meta">
        {organization && <div><dt>Organization</dt><dd title={organization}>{organization}</dd></div>}
        {location && <div><dt>Location</dt><dd title={location}>{location}</dd></div>}
      </dl>
      <Link className="home-text-link home-card-link" to={to} aria-label={`${section === 'jobs' ? 'View Job' : 'View Details'}: ${title}`}>
        {section === 'jobs' ? 'View Job' : 'View Details'} <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  )
}

export default HomeHighlightCard

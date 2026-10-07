import { Link } from 'react-router-dom'
import { ArrowRight, Bookmark, Building2 } from 'lucide-react'

function OpportunityCard({ title, category, organization, deadline, deadlineLabel, to, cta, location, workType, jobType, compensation, description, saved = false, onSave, compact = false, isDemo = false }) {
  return (
    <article className={compact ? 'home-card opportunity-card-compact' : 'home-card'}>
      {compact && <Building2 className="opportunity-logo" size={18} aria-hidden="true" />}
      <span className="home-tag">{category}{isDemo && ' · Demo'}</span>
      <h3 title={compact ? title : undefined}>{title}</h3>
      {onSave && (
        <button className="opportunity-save" type="button" aria-label={`${saved ? 'Unsave' : 'Save'} ${title}`} aria-pressed={saved} onClick={onSave}>
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
          {!compact && (saved ? 'Saved' : 'Save')}
        </button>
      )}
      <dl className="home-opportunity-meta">
        <div className={compact ? 'opportunity-organization' : undefined}><dt>Organization</dt><dd title={compact ? organization : undefined}>{organization}</dd></div>
        {location && <div><dt>Location</dt><dd>{location}</dd></div>}
        {workType && <div><dt>Work type</dt><dd>{workType}</dd></div>}
        {jobType && !compact && <div><dt>Job type</dt><dd>{jobType}</dd></div>}
        {compensation && <div className={compact ? 'opportunity-compensation' : undefined}><dt>Salary / stipend</dt><dd>{compensation}</dd></div>}
        <div><dt>Deadline</dt><dd><time dateTime={deadline}>{deadlineLabel}</time></dd></div>
      </dl>
      {description && !compact && <p className="home-card-excerpt">{description}</p>}
      <Link className="home-text-link home-card-link" to={to}>
        {cta} <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  )
}

export default OpportunityCard

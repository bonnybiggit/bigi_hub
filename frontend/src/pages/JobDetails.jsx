import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Bookmark, ExternalLink } from 'lucide-react'
import { archivedJobs } from '../data/jobs.js'
import useJobs from '../hooks/useJobs.js'
import NotFound from './NotFound.jsx'
import '../styles/home.css'
import '../styles/jobs.css'

function JobDetails({ savedJobIds, onSaveJob }) {
  const { slug } = useParams()
  const { jobs, loading, error, retry } = useJobs()
  const job = [...jobs, ...archivedJobs].find((item) => item.slug === slug)
  if (!job && loading) return <div className="jobs-page" role="status">Loading job details...</div>
  if (!job && error) return <div className="jobs-page" role="alert"><p>{error}</p><button className="home-button home-button-primary" type="button" onClick={retry}>Try again</button><Link to="/jobs">Back to jobs</Link></div>
  if (!job) return <><NotFound /><Link to="/jobs">Back to jobs</Link></>

  const saved = savedJobIds.includes(job.id)
  const facts = [
    ['Organization', job.organization], ['Location', job.location],
    ['Work type', job.workType], ['Job type', job.jobType],
    ['Salary / stipend', job.compensation],
    ...(job.duration ? [['Duration', job.duration]] : []),
  ]

  return (
    <article className="jobs-page job-details">
      <Link className="home-text-link" to="/jobs"><ArrowLeft size={18} aria-hidden="true" />Back to jobs</Link>
      <header className="job-details-header"><span className="home-tag">{job.jobType} · {job.isArchived ? 'Archived' : job.isDemo ? 'Demo' : 'Job'}</span><h1>{job.title}</h1><p>{job.organization}</p><p className="jobs-note">{job.isArchived ? 'Archived supplied example. Country eligibility is unconfirmed, so this record is excluded from active discovery and applications.' : job.isDemo ? 'Fictional demo job and organization for the Nigeria/Africa preview. This is not a real vacancy.' : ''}</p></header>
      <dl className="job-details-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}<div><dt>Deadline</dt><dd><time dateTime={job.deadline}>{job.deadlineLabel}</time></dd></div></dl>
      <section aria-labelledby="job-description"><h2 id="job-description">About this opportunity</h2><p>{job.description}</p></section>
      <section aria-labelledby="job-requirements"><h2 id="job-requirements">Requirements</h2><ul>{job.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></section>
      <section aria-labelledby="job-benefits"><h2 id="job-benefits">Benefits</h2><ul>{job.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul></section>
      <div className="job-details-actions">
        {!job.isArchived && job.applyUrl && <a className="home-button home-button-primary" href={job.applyUrl} target="_blank" rel="noopener noreferrer" aria-describedby="job-apply-note">Apply Now <ExternalLink size={18} aria-hidden="true" /></a>}
        <button className="home-button home-button-secondary" type="button" aria-pressed={saved} onClick={() => onSaveJob(job.id)}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{saved ? 'Saved Job' : 'Save Job'}</button>
      </div>
      <p id="job-apply-note" className="jobs-note">{!job.isArchived && job.isDemo && 'Apply Now opens example.com in a new tab as a placeholder, not an application form. '}Saved jobs last until you reload.</p>
    </article>
  )
}

export default JobDetails

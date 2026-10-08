import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import { ArrowLeft, Bookmark, ExternalLink } from 'lucide-react'
import { getJobBySlug } from '../services/jobs.service.js'
import '../styles/home.css'
import '../styles/jobs.css'
import '../styles/job-details.css'

const text = value => typeof value === 'string' && value.trim() ? value : 'Not specified'

function DetailSection({ title, value }) {
  const items = Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : null
  return <section aria-label={title}><h2>{title}</h2>{items?.length
    ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
    : <p className="job-details-copy">{text(items ? '' : value)}</p>}</section>
}

function applicationLink(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

function JobDetails({ savedJobIds, onSaveJob }) {
  const { slug } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ key: '', job: null, error: '' })
  const key = `${slug}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    getJobBySlug(slug, { signal: controller.signal }).then(job => {
      if (!controller.signal.aborted) setState({ key, job, error: '', checkedAt: Date.now() })
    }).catch(failure => {
      if (!controller.signal.aborted) setState({ key, job: null, error: failure.response?.status === 404 ? '' : 'Unable to load this job. Please try again.' })
    })
    return () => controller.abort()
  }, [slug, key])

  const pendingSeo = <Seo title="Job details | Bigi_Hub" description="View job details and application information on Bigi_Hub." noindex />
  const unavailableSeo = <Seo title="Job unavailable | Bigi_Hub" description="This job could not be loaded. Explore other jobs on Bigi_Hub." noindex />
  const back = <Link className="home-text-link" to="/jobs"><ArrowLeft size={18} aria-hidden="true" />Back to Jobs</Link>
  if (state.key !== key) return <div className="jobs-page job-details">{pendingSeo}{back}<div className="jobs-empty" role="status">Loading job details...</div></div>
  if (!state.job) return <div className="jobs-page job-details">{unavailableSeo}{back}<div className="jobs-empty" role={state.error ? 'alert' : 'status'}>
    <h1>{state.error ? 'Unable to load job' : 'Job not found'}</h1>
    <p>{state.error || 'This job is unavailable. It may have been archived or removed, or the link may be incorrect.'}</p>
    <button className="home-button home-button-primary" type="button" onClick={() => setAttempt(current => current + 1)}>Retry</button>
  </div></div>

  const job = state.job
  const deadline = job.deadline ? new Date(job.deadline) : null
  const validDeadline = deadline && !Number.isNaN(deadline.getTime())
  const archived = Boolean(job.archivedAt || job.isArchived)
  const expired = validDeadline && deadline.getTime() < state.checkedAt
  const closed = archived || expired
  const applyUrl = applicationLink(job.applyUrl)
  const saved = savedJobIds.includes(job.id)
  const facts = [
    ['Organization', job.organization], ['Location', job.location],
    ['Job type', job.jobType], ['Work type', job.workType],
    ['Experience level', job.experienceLevel], ['Salary', job.compensation],
  ]
  return <article className="jobs-page job-details">
    <Seo title={text(job.title) === 'Not specified' ? 'Job details | Bigi_Hub' : text(job.title) + ' | Bigi_Hub'} description={text(job.description) === 'Not specified' ? 'View available job details and application information on Bigi_Hub.' : job.description} breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Jobs', path: '/jobs' }, { name: text(job.title), path: '/jobs/' + slug }]} />
    {back}
    <header className="job-details-header"><span className="home-tag">{text(job.jobType)}</span><h1>{text(job.title)}</h1><p>{text(job.organization)}</p></header>
    {closed && <p className="job-details-closed" role="status"><strong>{archived ? 'Archived job' : 'Application deadline passed'}</strong>. {archived ? 'This listing is archived.' : 'The listed application deadline has passed.'}</p>}
    <div className="job-details-actions">
      {applyUrl && <a className="home-button home-button-primary" href={applyUrl} target="_blank" rel="noopener noreferrer">{closed ? 'View Application' : 'Apply Now'}<ExternalLink size={18} aria-hidden="true" /></a>}
      <button className="home-button home-button-secondary" type="button" aria-pressed={saved} onClick={() => onSaveJob(job.id)}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{saved ? 'Saved Job' : 'Save Job'}</button>
    </div>
    <p className="jobs-note">{applyUrl && 'Application link opens in a new tab. '}Saved jobs last until you reload.</p>
    <dl className="job-details-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}<div><dt>Deadline</dt><dd>{validDeadline ? <time dateTime={deadline.toISOString()}>{deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time> : 'Not specified'}</dd></div></dl>
    <DetailSection title="Description" value={job.description} />
    <DetailSection title="Requirements" value={job.requirements} />
    <DetailSection title="Responsibilities" value={job.responsibilities} />
    {job.benefits?.length > 0 && <DetailSection title="Benefits" value={job.benefits} />}
    <section aria-label="Application information"><h2>Application information</h2>
      <dl className="job-details-application"><div><dt>How to apply</dt><dd className="job-details-copy">{text(job.howToApply)}</dd></div><div><dt>Application email</dt><dd>{text(job.applicationEmail)}</dd></div><div><dt>Application URL</dt><dd>{applyUrl ? <a href={applyUrl} target="_blank" rel="noopener noreferrer">{applyUrl}</a> : 'Not specified'}</dd></div></dl>
    </section>
  </article>
}

export default JobDetails

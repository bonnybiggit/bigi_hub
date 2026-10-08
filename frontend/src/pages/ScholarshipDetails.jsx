import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import { ArrowLeft, Bookmark, ExternalLink } from 'lucide-react'
import { getScholarshipBySlug } from '../services/scholarships.service.js'
import '../styles/home.css'
import '../styles/scholarships.css'
import '../styles/scholarship-details.css'

const text = value => typeof value === 'string' && value.trim() ? value : 'Not specified'

function DetailContent({ value }) {
  const items = Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : null
  return items?.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="scholarship-details-copy">{text(items ? '' : value)}</p>
}

function webLink(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

function ScholarshipDetails({ savedScholarshipIds, onSaveScholarship }) {
  const { slug } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ key: '', scholarship: null, error: '' })
  const key = `${slug}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    getScholarshipBySlug(slug, { signal: controller.signal }).then(scholarship => {
      if (!controller.signal.aborted) setState({ key, scholarship, error: '', checkedAt: Date.now() })
    }).catch(failure => {
      if (!controller.signal.aborted) setState({ key, scholarship: null, error: failure.response?.status === 404 ? '' : 'Unable to load this scholarship. Please try again.' })
    })
    return () => controller.abort()
  }, [slug, key])

  const pendingSeo = <Seo title="Scholarship details | Bigi_Hub" description="View scholarship details and application information on Bigi_Hub." noindex />
  const unavailableSeo = <Seo title="Scholarship unavailable | Bigi_Hub" description="This scholarship could not be loaded. Explore other scholarships on Bigi_Hub." noindex />
  const back = <Link className="home-text-link" to="/scholarships"><ArrowLeft size={18} aria-hidden="true" />Back to Scholarships</Link>
  if (state.key !== key) return <div className="scholarships-page scholarship-details">{pendingSeo}{back}<div className="scholarships-state" role="status">Loading scholarship details...</div></div>
  if (!state.scholarship) return <div className="scholarships-page scholarship-details">{unavailableSeo}{back}<div className="scholarships-state" role={state.error ? 'alert' : 'status'}>
    <h1>{state.error ? 'Unable to load scholarship' : 'Scholarship not found'}</h1>
    <p>{state.error || 'This scholarship is unavailable. It may have been removed, or the link may be incorrect.'}</p>
    <button className="home-button home-button-primary" type="button" onClick={() => setAttempt(current => current + 1)}>Retry</button>
  </div></div>

  const scholarship = state.scholarship
  const deadline = scholarship.deadline ? new Date(scholarship.deadline) : null
  const validDeadline = deadline && !Number.isNaN(deadline.getTime())
  const archived = Boolean(scholarship.archivedAt || scholarship.isArchived || scholarship.status === 'archived')
  const expired = validDeadline && deadline.getTime() < state.checkedAt
  const applyUrl = webLink(scholarship.applyUrl)
  const sourceUrl = webLink(scholarship.sourceUrl) || webLink(scholarship.source)
  const saved = savedScholarshipIds.includes(scholarship.id)
  const facts = [['Organization', scholarship.organization], ['Study level', scholarship.level], ['Location', scholarship.location], ['Country', scholarship.countryCode], ['Eligibility', scholarship.eligibility], ['Funding', scholarship.funding]]
  return <article className="scholarships-page scholarship-details">
    <Seo title={text(scholarship.title) === 'Not specified' ? 'Scholarship details | Bigi_Hub' : text(scholarship.title) + ' | Bigi_Hub'} description={text(scholarship.description) === 'Not specified' ? 'View available scholarship details and application information on Bigi_Hub.' : scholarship.description} breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Scholarships', path: '/scholarships' }, { name: text(scholarship.title), path: '/scholarships/' + slug }]} />
    {back}
    <header className="scholarship-details-header"><span className="home-tag">{text(scholarship.level)}</span><h1>{text(scholarship.title)}</h1><p>{text(scholarship.organization)}</p></header>
    {(archived || expired) && <p className="scholarship-details-closed" role="status"><strong>{archived ? 'Archived scholarship' : 'Application deadline passed'}</strong>. {archived ? 'This listing is archived.' : 'The listed application deadline has passed.'}</p>}
    <div className="scholarship-details-actions">
      {applyUrl && <a className="home-button home-button-primary" href={applyUrl} target="_blank" rel="noopener noreferrer">{archived || expired ? 'View Scholarship' : 'Apply Now'}<ExternalLink size={18} aria-hidden="true" /></a>}
      <button className="home-button home-button-secondary" type="button" aria-pressed={saved} onClick={() => onSaveScholarship(scholarship.id)}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{saved ? 'Saved Scholarship' : 'Save Scholarship'}</button>
    </div>
    {applyUrl && <p className="scholarship-details-note">Application link opens in a new tab.</p>}
    <dl className="scholarship-details-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}<div><dt>Deadline</dt><dd>{validDeadline ? <time dateTime={deadline.toISOString()}>{deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time> : 'Not specified'}</dd></div></dl>
    <section aria-label="Description"><h2>Description</h2><DetailContent value={scholarship.description} /></section>
    <section aria-label="Requirements"><h2>Requirements</h2><DetailContent value={scholarship.requirements} /></section>
    <section aria-label="Benefits"><h2>Benefits</h2><DetailContent value={scholarship.benefits?.length ? scholarship.benefits : scholarship.benefit} /></section>
    <section aria-label="Application information"><h2>Application information</h2><dl className="scholarship-details-application">
      <div><dt>How to apply</dt><dd className="scholarship-details-copy">{text(scholarship.howToApply)}</dd></div>
      <div><dt>Application email</dt><dd>{text(scholarship.applicationEmail)}</dd></div>
      <div><dt>Application URL</dt><dd>{applyUrl ? <a href={applyUrl} target="_blank" rel="noopener noreferrer">{applyUrl}</a> : 'Not specified'}</dd></div>
    </dl></section>
    <section aria-label="Source"><h2>Source</h2>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{text(scholarship.sourceName) === 'Not specified' ? sourceUrl : scholarship.sourceName}</a> : <DetailContent value={scholarship.sourceName || scholarship.source} />}</section>
  </article>
}

export default ScholarshipDetails

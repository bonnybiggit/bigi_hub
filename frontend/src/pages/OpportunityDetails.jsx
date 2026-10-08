import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import { ArrowLeft, Bookmark, ExternalLink } from 'lucide-react'
import { getOpportunityBySlug } from '../services/opportunities.service.js'
import '../styles/home.css'
import '../styles/opportunities.css'
import '../styles/opportunity-details.css'

const text = value => typeof value === 'string' && value.trim() ? value : 'Not specified'

function DetailContent({ value }) {
  const items = Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : null
  return items?.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="opportunity-details-copy">{text(items ? '' : value)}</p>
}

function webLink(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

function OpportunityDetails({ savedOpportunityIds, onSaveOpportunity }) {
  const { slug } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ key: '', opportunity: null, error: '' })
  const key = `${slug}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    getOpportunityBySlug(slug, { signal: controller.signal }).then(opportunity => {
      if (!controller.signal.aborted) setState({ key, opportunity, error: '', checkedAt: Date.now() })
    }).catch(failure => {
      if (!controller.signal.aborted) setState({ key, opportunity: null, error: failure.response?.status === 404 ? '' : 'Unable to load this opportunity. Please try again.' })
    })
    return () => controller.abort()
  }, [slug, key])

  const pendingSeo = <Seo title="Opportunity details | Bigi_Hub" description="View opportunity details and application information on Bigi_Hub." noindex />
  const unavailableSeo = <Seo title="Opportunity unavailable | Bigi_Hub" description="This opportunity could not be loaded. Explore other opportunities on Bigi_Hub." noindex />
  const back = <Link className="home-text-link" to="/opportunities"><ArrowLeft size={18} aria-hidden="true" />Back to Opportunities</Link>
  if (state.key !== key) return <div className="opportunities-page opportunity-details">{pendingSeo}{back}<div className="opportunities-empty" role="status">Loading opportunity details...</div></div>
  if (!state.opportunity) return <div className="opportunities-page opportunity-details">{unavailableSeo}{back}<div className="opportunities-empty" role={state.error ? 'alert' : 'status'}>
    <h1>{state.error ? 'Unable to load opportunity' : 'Opportunity not found'}</h1>
    <p>{state.error || 'This opportunity is unavailable. It may have been removed, or the link may be incorrect.'}</p>
    <button className="home-button home-button-primary" type="button" onClick={() => setAttempt(current => current + 1)}>Retry</button>
  </div></div>

  const opportunity = state.opportunity
  const deadline = opportunity.deadline ? new Date(opportunity.deadline) : null
  const validDeadline = deadline && !Number.isNaN(deadline.getTime())
  const archived = Boolean(opportunity.archivedAt || opportunity.isArchived || opportunity.status === 'archived')
  const expired = validDeadline && deadline.getTime() < state.checkedAt
  const applyUrl = webLink(opportunity.applyUrl)
  const sourceUrl = webLink(opportunity.sourceUrl) || webLink(opportunity.source)
  const saved = savedOpportunityIds.includes(opportunity.id)
  const facts = [['Organization', opportunity.organization], ['Category', opportunity.category], ['Location', opportunity.location], ['Eligibility', opportunity.eligibility], ['Funding', opportunity.funding]]
  return <article className="opportunities-page opportunity-details">
    <Seo title={text(opportunity.title) === 'Not specified' ? 'Opportunity details | Bigi_Hub' : text(opportunity.title) + ' | Bigi_Hub'} description={text(opportunity.description) === 'Not specified' ? 'View available opportunity details and application information on Bigi_Hub.' : opportunity.description} breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Opportunities', path: '/opportunities' }, { name: text(opportunity.title), path: '/opportunities/' + slug }]} />
    {back}
    <header className="opportunity-details-header"><span className="home-tag">{text(opportunity.category)}</span><h1>{text(opportunity.title)}</h1><p>{text(opportunity.organization)}</p></header>
    {(archived || expired) && <p className="opportunity-details-closed" role="status"><strong>{archived ? 'Archived opportunity' : 'Application deadline passed'}</strong>. {archived ? 'This listing is archived.' : 'The listed application deadline has passed.'}</p>}
    <div className="opportunity-details-actions">
      {applyUrl && <a className="home-button home-button-primary" href={applyUrl} target="_blank" rel="noopener noreferrer">{archived || expired ? 'View Opportunity' : 'Apply Now'}<ExternalLink size={18} aria-hidden="true" /></a>}
      <button className="home-button home-button-secondary" type="button" aria-pressed={saved} onClick={() => onSaveOpportunity(opportunity.id)}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{saved ? 'Saved Opportunity' : 'Save Opportunity'}</button>
    </div>
    {applyUrl && <p className="opportunities-note">Application link opens in a new tab.</p>}
    <dl className="opportunity-details-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}<div><dt>Deadline</dt><dd>{validDeadline ? <time dateTime={deadline.toISOString()}>{deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time> : 'Not specified'}</dd></div></dl>
    <section aria-label="Description"><h2>Description</h2><DetailContent value={opportunity.description} /></section>
    <section aria-label="Requirements"><h2>Requirements</h2><DetailContent value={opportunity.requirements} /></section>
    <section aria-label="Benefits"><h2>Benefits</h2><DetailContent value={opportunity.benefits?.length ? opportunity.benefits : opportunity.benefit} /></section>
    <section aria-label="Application information"><h2>Application information</h2><dl className="opportunity-details-application">
      <div><dt>How to apply</dt><dd className="opportunity-details-copy">{text(opportunity.howToApply)}</dd></div>
      <div><dt>Application email</dt><dd>{text(opportunity.applicationEmail)}</dd></div>
      <div><dt>Application URL</dt><dd>{applyUrl ? <a href={applyUrl} target="_blank" rel="noopener noreferrer">{applyUrl}</a> : 'Not specified'}</dd></div>
    </dl></section>
    <section aria-label="Source"><h2>Source</h2>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{text(opportunity.sourceName) === 'Not specified' ? sourceUrl : opportunity.sourceName}</a> : <DetailContent value={opportunity.sourceName || opportunity.source} />}</section>
  </article>
}

export default OpportunityDetails

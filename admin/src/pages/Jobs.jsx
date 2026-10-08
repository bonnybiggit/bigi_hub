import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import JobForm from '../components/JobForm.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { deleteJob, listJobs, updateJob } from '../services/jobs.service.js'

const emptyFilters = { search: '', location: '', jobType: '', workType: '', experience: '', status: 'all' }
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'Not specified'
export default function Jobs() {
  usePageTitle('Jobs')
  const [filters, setFilters] = useState(emptyFilters)
  const [request, setRequest] = useState({ filters: emptyFilters, page: 1, revision: 0 })
  const [result, setResult] = useState({ jobs: [], pagination: null, loading: true, error: '' })
  const [editor, setEditor] = useState(null)
  const [pending, setPending] = useState(null)
  const confirmationTitle = useRef(null)
  const [busy, setBusy] = useState(false)
  const mutating = useRef(false)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    listJobs({ ...request.filters, page: request.page, limit: 10 }, controller.signal).then(response => {
      if (!controller.signal.aborted) setResult({ jobs: response.data, pagination: response.pagination, loading: false, error: '' })
    }).catch(failure => {
      if (!controller.signal.aborted) setResult({ jobs: [], pagination: null, loading: false, error: failure.message || 'Unable to load jobs. Please try again.' })
    })
    return () => controller.abort()
  }, [request])
  useEffect(() => {
    if (pending) {
      confirmationTitle.current?.focus({ preventScroll: true })
      confirmationTitle.current?.scrollIntoView({ block: 'center' })
    }
  }, [pending])
  function load(nextFilters = request.filters, page = request.page) {
    setResult(current => ({ ...current, loading: true, error: '' }))
    setRequest(current => ({ filters: nextFilters, page, revision: current.revision + 1 }))
  }
  function applyFilters(event) { event.preventDefault(); load(filters, 1) }
  function changeFilter(event) { setFilters(current => ({ ...current, [event.target.name]: event.target.value })) }
  function saved(job, editing) {
    setEditor(null); setActionError(''); setMessage(`“${job.title}” ${editing ? 'updated' : 'created'} successfully.`)
    if (editing) load()
    else { setFilters(emptyFilters); load(emptyFilters, 1) }
  }
  function chooseAction(job, action) { setPending({ job, action }); setActionError(''); setMessage('') }
  async function confirmAction() {
    if (mutating.current) return
    mutating.current = true; setBusy(true); setActionError('')
    const { job, action } = pending
    try {
      if (action === 'delete') await deleteJob(job._id)
      else await updateJob(job._id, { archived: action === 'archive' })
      setPending(null)
      setMessage(`“${job.title}” ${action === 'delete' ? 'deleted' : action === 'archive' ? 'archived' : 'restored'} successfully.`)
      load(request.filters, result.jobs.length === 1 && request.page > 1 ? request.page - 1 : request.page)
    } catch (failure) { setActionError(failure.message || 'Unable to update this job. Please try again.') }
    finally { mutating.current = false; setBusy(false) }
  }
  return <>
    <PageHeader title="Jobs" description="Manage jobs stored in the database." />
    {message && <p className="job-notice" role="status">{message}</p>}
    {editor ? <JobForm key={editor.job?._id || 'create'} job={editor.job} onSaved={saved} onCancel={() => setEditor(null)} /> : <>
      <div className="section-heading"><h2>Job listings</h2><button type="button" className="auth-button" disabled={Boolean(pending)} onClick={() => { setEditor({ job: null }); setMessage('') }}>Create job</button></div>
      <form className="panel job-filters" onSubmit={applyFilters} aria-label="Search and filter jobs">
        <div className="job-field"><label htmlFor="jobs-search">Search jobs</label><input id="jobs-search" name="search" type="search" value={filters.search} maxLength={200} onChange={changeFilter} placeholder="Title, organization or description" /></div>
        {[['location', 'Location'], ['jobType', 'Job type'], ['experience', 'Experience level']].map(([key, label]) => <div className="job-field" key={key}><label htmlFor={`jobs-${key}`}>{label}</label><input id={`jobs-${key}`} name={key} value={filters[key]} maxLength={200} onChange={changeFilter} /></div>)}
        <div className="job-field"><label htmlFor="jobs-workType">Work type</label><select id="jobs-workType" name="workType" value={filters.workType} onChange={changeFilter}><option value="">All work types</option>{['Remote', 'Hybrid', 'On-site'].map(value => <option key={value}>{value}</option>)}</select></div>
        <div className="job-field"><label htmlFor="jobs-status">Status</label><select id="jobs-status" name="status" value={filters.status} onChange={changeFilter}><option value="all">All jobs</option><option value="active">Active</option><option value="archived">Archived</option></select></div>
        <div className="job-actions"><button className="auth-button" type="submit" disabled={busy}>Search / filter</button><button className="secondary-button" type="button" disabled={busy} onClick={() => { setFilters(emptyFilters); load(emptyFilters, 1) }}>Reset</button></div>
      </form>
      {pending && <section className="panel job-confirmation" aria-labelledby="job-confirm-title">
        <h2 id="job-confirm-title" ref={confirmationTitle} tabIndex={-1}>{pending.action === 'delete' ? 'Delete job permanently?' : pending.action === 'archive' ? 'Archive job?' : 'Restore job?'}</h2>
        <p>“{pending.job.title}” — {pending.action === 'delete' ? 'This permanently removes the job and cannot be undone.' : pending.action === 'archive' ? 'The job will be retained in Admin and removed from public listings.' : 'The job will return to public listings.'}</p>
        {actionError && <p className="field-error" role="alert">{actionError}</p>}
        <div className="job-actions"><button className={pending.action === 'delete' ? 'danger-button' : 'auth-button'} disabled={busy} onClick={confirmAction}>{busy ? 'Updating…' : pending.action === 'delete' ? 'Delete permanently' : pending.action === 'archive' ? 'Confirm archive' : 'Confirm restore'}</button><button className="secondary-button" disabled={busy} onClick={() => setPending(null)}>Cancel</button></div>
      </section>}
      <section className="panel jobs-results" aria-label="Jobs results" aria-busy={result.loading}>
        {result.loading ? <p role="status">Loading jobs…</p> : result.error ? <><p className="field-error" role="alert">{result.error}</p><button className="secondary-button" onClick={() => load()}>Retry</button></> : <>
          <p role="status">{result.pagination.total} job{result.pagination.total === 1 ? '' : 's'} found.</p>
          {!result.jobs.length ? <p>No jobs match these filters. Reset the filters or create a job.</p> : <div className="jobs-table-scroll"><table className="jobs-table"><caption className="visually-hidden">Jobs and management actions</caption><thead><tr><th scope="col">Job</th><th scope="col">Location / type</th><th scope="col">Deadline</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{result.jobs.map(job => <tr key={job._id}>
            <th scope="row"><strong>{job.title}</strong><span>{job.organization}</span><small>{job.slug}</small></th>
            <td>{job.location}<span>{job.jobType}{job.workType && ` · ${job.workType}`}</span></td><td>{dateLabel(job.deadline)}</td><td>{job.archivedAt ? 'Archived' : 'Active'}</td>
            <td><div className="job-row-actions"><button className="secondary-button" disabled={Boolean(pending)} aria-label={`Edit ${job.title}`} onClick={() => { setEditor({ job }); setMessage('') }}>Edit</button><button className="secondary-button" disabled={Boolean(pending)} aria-label={`${job.archivedAt ? 'Restore' : 'Archive'} ${job.title}`} onClick={() => chooseAction(job, job.archivedAt ? 'restore' : 'archive')}>{job.archivedAt ? 'Restore' : 'Archive'}</button><button className="danger-button" disabled={Boolean(pending)} aria-label={`Delete ${job.title}`} onClick={() => chooseAction(job, 'delete')}>Delete</button></div></td>
          </tr>)}</tbody></table></div>}
          {result.pagination.totalPages > 1 && <nav className="job-pagination" aria-label="Jobs pagination"><button className="secondary-button" disabled={request.page <= 1 || busy} onClick={() => load(request.filters, request.page - 1)}>Previous</button><span>Page {request.page} of {result.pagination.totalPages}</span><button className="secondary-button" disabled={request.page >= result.pagination.totalPages || busy} onClick={() => load(request.filters, request.page + 1)}>Next</button></nav>}
        </>}
      </section>
    </>}
  </>
}

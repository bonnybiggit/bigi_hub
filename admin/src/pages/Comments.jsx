import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { apiRequest } from '../services/apiClient.js'

const categories = [['all', 'All categories'], ['sports', 'Sports'], ['news', 'News'], ['business', 'Business'], ['technology', 'Technology'], ['health', 'Health']]
const statuses = [['approved', 'Visible'], ['hidden', 'Hidden'], ['pending', 'Legacy pending'], ['all', 'All']]
const label = (list, value) => list.find(([key]) => key === value)?.[1] || value

export default function Comments() {
  usePageTitle('Comments & Moderation')
  const [status, setStatus] = useState('approved')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const key = `${status}:${category}:${page}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    apiRequest('admin/comments', { params: { status, category, page, limit: 20 }, signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setState({ key, ...result })
    }).catch(failure => {
      if (!controller.signal.aborted) setState({ key, error: failure.message })
    })
    return () => controller.abort()
  }, [key, page, status, category])
  async function moderate(id, action) {
    if (action === 'delete' && !window.confirm('Permanently delete this comment? This cannot be undone.')) return
    setBusy(true); setError(''); setMessage('')
    try {
      await apiRequest(`admin/comments/${id}`, action === 'delete' ? { method: 'DELETE' } : { method: 'PATCH', body: { status: action } })
      setMessage(action === 'delete' ? 'Comment deleted.' : action === 'approved' ? 'Comment restored.' : 'Comment hidden.')
      setAttempt(value => value + 1)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const loading = state?.key !== key
  return <><PageHeader title="Comments & Moderation" description="Comments publish immediately. Hide to remove from public view, restore to show again, or delete permanently." />
    <section className="panel sports-moderation">
      <div className="moderation-filters">
        <label>Category <select value={category} disabled={busy} onChange={event => { setCategory(event.target.value); setPage(1) }}>{categories.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        <label>Status <select value={status} disabled={busy} onChange={event => { setStatus(event.target.value); setPage(1) }}>{statuses.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        <button disabled={busy} onClick={() => setAttempt(value => value + 1)}>Refresh</button>
      </div>
      {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      {loading ? <p role="status">Loading comments...</p> : state.error ? <p role="alert">{state.error}</p> : <>
        {state.data.length === 0 && <p>No comments match these filters.</p>}
        {state.data.map(comment => <article className="sports-moderation-comment" key={comment._id}>
          <div className="moderation-comment-head">
            <h2>{comment.article?.title || 'Unavailable article'}</h2>
            <span className="moderation-badge">{label(categories, comment.article?.category || comment.category || 'sports')}</span>
            <span className={`moderation-badge status-${comment.status}`}>{label(statuses, comment.status)}</span>
          </div>
          <p className="moderation-meta"><strong>{comment.displayName}</strong> · {new Date(comment.createdAt).toLocaleString()}</p>
          <p className="sports-comment-text">{comment.text}</p>
          <div className="sports-moderation-actions">
            {comment.status === 'approved'
              ? <button disabled={busy} onClick={() => moderate(comment._id, 'hidden')}>Hide</button>
              : <button disabled={busy} onClick={() => moderate(comment._id, 'approved')}>Restore</button>}
            <button className="danger" disabled={busy} onClick={() => moderate(comment._id, 'delete')}>Delete</button>
          </div>
        </article>)}
        <div className="sports-moderation-actions"><button disabled={busy || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button disabled={busy || page >= (state.pagination?.totalPages || 1)} onClick={() => setPage(value => value + 1)}>Next</button></div>
      </>}
    </section></>
}

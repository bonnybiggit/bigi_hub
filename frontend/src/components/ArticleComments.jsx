import { useEffect, useId, useState } from 'react'
import apiClient from '../services/apiClient.js'
import { publicCategory } from '../config/contentCategories.js'

const initial = name => (name.trim()[0] || '?').toUpperCase()

// Shared by every commentable article page. Comments are plain text and publish immediately.
export default function ArticleComments({ category = 'sports', slug }) {
  const id = useId()
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const path = `${publicCategory(category).apiPath}/${encodeURIComponent(slug)}/comments`
  const key = `${path}:${page}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    apiClient.get(path, { params: { page, limit: 10 }, signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setState({ key, ...response.data })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ key, error: 'Unable to load comments. Please try again.' })
    })
    return () => controller.abort()
  }, [path, page, key])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('')
    try {
      const response = await apiClient.post(path, { displayName, text })
      setMessage(response.data.message); setText(''); setPage(1); setAttempt(value => value + 1)
    } catch (failure) {
      setError(failure.response?.data?.message || 'Unable to submit your comment. Please try again.')
    } finally { setBusy(false) }
  }
  const loading = state?.key !== key
  const total = state?.pagination?.total
  return <section className="home-card article-comments" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>Comments{typeof total === 'number' && total > 0 ? <span className="comment-count">{total}</span> : null}</h2>
    <form onSubmit={submit} className="comment-form">
      <div className="comment-field comment-field-name">
        <label htmlFor={`${id}-name`}>Name</label>
        <input id={`${id}-name`} value={displayName} onChange={event => setDisplayName(event.target.value)} required maxLength={60} disabled={busy} autoComplete="nickname" placeholder="Your name" />
      </div>
      <div className="comment-field">
        <label htmlFor={`${id}-text`}>Comment</label>
        <textarea id={`${id}-text`} value={text} onChange={event => setText(event.target.value)} required maxLength={1000} rows={3} disabled={busy} placeholder="Add a comment" />
      </div>
      <div className="comment-form-footer">
        <small>{text.length}/1000 · No sign-in needed. Be respectful.</small>
        <button className="comment-submit" disabled={busy} type="submit">{busy ? 'Posting...' : 'Post'}</button>
      </div>
      {message && <p className="comment-feedback" role="status">{message}</p>}
      {error && <p className="comment-feedback is-error" role="alert">{error}</p>}
    </form>
    {loading ? <p role="status">Loading comments...</p> : state.error ? <div role="alert"><p>{state.error}</p><button className="comment-submit" type="button" onClick={() => setAttempt(value => value + 1)}>Retry comments</button></div> : <>
      {state.data.length ? <ul className="comment-list">{state.data.map(comment => <li className="comment-card" key={comment._id}>
        <span className="comment-avatar" aria-hidden="true">{initial(comment.displayName)}</span>
        <div className="comment-body"><div className="comment-meta"><strong>{comment.displayName}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString('en-GB')}</time></div><p>{comment.text}</p></div>
      </li>)}</ul> : <p className="comment-empty">No comments yet. Be the first to comment.</p>}
      {state.pagination.totalPages > 1 && <div className="comment-pagination"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} of {state.pagination.totalPages}</span><button disabled={page >= state.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div>}
    </>}
  </section>
}

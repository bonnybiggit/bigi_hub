import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import PostSources from '../components/PostSources.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { analyzePost, approvePost, getAIConfiguration, getAssistantPost, listAssistantPosts, publishPost, savePostReview } from '../services/aiPosts.service.js'
import { assistantDate, assistantFields, displayFact, postStatus, postTypes, readFlyer } from '../utils/assistantPost.js'

export default function AIPostAssistant() {
  usePageTitle('AI Post Assistant')
  const [sourceText, setSourceText] = useState('')
  const [image, setImage] = useState(null)
  const [configured, setConfigured] = useState(null)
  const [post, setPost] = useState(null)
  const [form, setForm] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState('')
  const lock = useRef(false)
  const fileInput = useRef(null)
  const reviewHeading = useRef(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState('')
  const [queueQuery, setQueueQuery] = useState({ page: 1, status: '', revision: 0 })
  const [queue, setQueue] = useState({ loading: true, data: [], pagination: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    getAIConfiguration(controller.signal).then(response => { if (!controller.signal.aborted) setConfigured(response.data.configured) }).catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    listAssistantPosts({ page: queueQuery.page, status: queueQuery.status, limit: 10 }, controller.signal).then(response => {
      if (!controller.signal.aborted) setQueue({ loading: false, data: response.data, pagination: response.pagination, error: '' })
    }).catch(failure => {
      if (!controller.signal.aborted) setQueue({ loading: false, data: [], pagination: null, error: failure.message || 'Unable to load assistant posts.' })
    })
    return () => controller.abort()
  }, [queueQuery])
  useEffect(() => {
    if (post?._id) { reviewHeading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }) }
  }, [post?._id])
  function reloadQueue(page = queueQuery.page, status = queueQuery.status) {
    setQueue(current => ({ ...current, loading: true, error: '' }))
    setQueueQuery(current => ({ page, status, revision: current.revision + 1 }))
  }
  function choosePost(value) {
    setPost(value); setForm({ postType: value.postType, fields: { ...value.fields }, deadlineDate: value.deadlineDate || '' })
    setDirty(false); setConfirmed(false); setFieldErrors({})
  }
  async function run(operation, action) {
    if (lock.current) return
    lock.current = true; setBusy(operation); setError(''); setMessage(''); setFieldErrors({})
    try { await action() } catch (failure) { setError(failure.message || 'The request failed. Your content has not been published. Try again.'); setFieldErrors(failure.errors || {}) }
    finally { lock.current = false; setBusy('') }
  }
  function changeField(event) {
    const { name, value } = event.target
    setForm(current => ({ ...current, fields: { ...current.fields, [name]: value }, ...(name === 'deadline' ? { deadlineDate: '' } : {}) }))
    setDirty(true); setConfirmed(false); setFieldErrors(current => ({ ...current, [name]: undefined }))
  }
  function changeMeta(event) {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value })); setDirty(true); setConfirmed(false)
  }
  async function saveReview() {
    const response = await savePostReview(post._id, { ...form, revision: post.revision })
    choosePost(response.data)
    return response.data
  }
  function newInput() {
    setPost(null); setForm(null); setImage(null); setSourceText(''); setError(''); setMessage(''); setFieldErrors({}); setConfirmed(false); setDirty(false)
  }
  const readOnly = post && ['published', 'archived'].includes(post.status)
  const approved = post?.status === 'approved' && !dirty
  const step = busy === 'analyze' ? 1 : !post ? 0 : readOnly ? 4 : approved ? 3 : 2
  const source = post ? { text: post.sourceText, image: post.sourceImage, imageText: post.imageText, evidence: post.evidence } : { text: sourceText, image }
  return <>
    <PageHeader title="AI Post Assistant" description="Extract source facts, review every field, then approve and publish when ready." />
    <ol className="assistant-steps" aria-label="Post workflow">{['Upload / Paste', 'Analyze', 'Review / Edit', 'Approve', 'Publish'].map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}>{index + 1}. {label}</li>)}</ol>
    <p className="assistant-note">AI never publishes automatically. Missing facts are shown as “Not specified”. Check every extraction against its source.</p>
    {error && <p className="job-notice field-error" role="alert">{error} {error.includes('post changed') && post && <button className="secondary-button" disabled={Boolean(busy)} onClick={() => run('open', async () => { choosePost((await getAssistantPost(post._id)).data); setMessage('Latest post loaded. Review your changes again.') })}>Reload post</button>}</p>}
    {message && <p className="job-notice" role="status">{message}</p>}
    {busy && <p role="status">{busy === 'analyze' ? 'Analyzing source content…' : busy === 'image' ? 'Reading image…' : 'Saving / loading post…'}</p>}
    {!post ? <section className="panel" aria-labelledby="assistant-input-title">
      <h2 id="assistant-input-title">Upload a flyer, paste text, or use both</h2>
      {configured === false && <p className="field-error" role="status">AI analysis is not configured. Set GEMINI_API_KEY on the backend. Existing drafts can still be reviewed.</p>}
      <form onSubmit={event => { event.preventDefault(); run('analyze', async () => { if (!sourceText.trim() && !image) throw new Error('Paste text or upload a flyer first.'); choosePost((await analyzePost({ text: sourceText, image })).data); reloadQueue(1); setMessage('Analysis saved as a draft. Nothing has been published.') }) }}>
        <fieldset className="job-form-grid" disabled={Boolean(busy)}><legend className="visually-hidden">Source input</legend>
          <div className="job-field job-field-wide"><label htmlFor="assistant-flyer">Flyer image (PNG, JPEG, WebP; up to 4MB)</label><input ref={fileInput} id="assistant-flyer" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
            const file = event.target.files?.[0]
            if (!file) return
            run('image', async () => { try { setImage(await readFlyer(file)) } catch (failure) { setImage(null); if (fileInput.current) fileInput.current.value = ''; throw failure } })
          }} />{image && <button type="button" className="secondary-button" onClick={() => { setImage(null); if (fileInput.current) fileInput.current.value = '' }}>Remove image</button>}</div>
          <div className="job-field job-field-wide"><label htmlFor="assistant-text">Copied text</label><textarea id="assistant-text" rows={10} maxLength={20000} value={sourceText} onChange={event => setSourceText(event.target.value)} placeholder="Paste the original advert without rewriting it." /><small>{sourceText.length} / 20,000 characters</small></div>
        </fieldset>
        <p>Analyzing sends the supplied source to the configured AI provider for extraction.</p>
        <div className="job-actions"><button className="auth-button" type="submit" disabled={Boolean(busy) || configured === false || (!sourceText.trim() && !image)}>{busy === 'analyze' ? 'Analyzing…' : 'Analyze content'}</button></div>
      </form>
      {image && <PostSources {...source} />}
    </section> : <>
      <div className="section-heading"><h2 ref={reviewHeading} tabIndex={-1}>{readOnly ? 'Published post' : approved ? 'Approved — ready to publish' : 'Review and edit extracted content'}</h2><button className="secondary-button" disabled={Boolean(busy) || dirty} onClick={newInput}>New input</button></div>
      <p className="assistant-note">Status: {postStatus(post.status)}{dirty ? ' — unsaved changes; approval must be repeated' : ''}. Original source is retained with this post.</p>
      {post.warnings?.length > 0 && <details className="panel assistant-warnings" open><summary>Review notes</summary><ul>{post.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
      <div className="assistant-review-layout"><section className="panel" aria-label="Post review">
        {readOnly || approved ? <>
          <h3>{displayFact(post.fields.title)}</h3>
          <dl className="assistant-facts"><div><dt>Post type</dt><dd>{post.postType}</dd></div>{assistantFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{displayFact(post.fields[key])}</dd></div>)}<div><dt>Confirmed deadline date</dt><dd>{displayFact(post.deadlineDate)}</dd></div><div><dt>Expiry</dt><dd>{post.expiresAt ? assistantDate(post.expiresAt) + ' (Africa/Lagos)' : post.deadlineDate ? post.deadlineDate + ' at end of day (Africa/Lagos)' : '3 calendar months after publishing'}</dd></div></dl>
          <p>Published assistant posts are stored here. Public display is not connected in this foundation.</p>
          {approved && <><p>{post.deadlineDate && new Date(post.deadlineDate + 'T23:59:59.999+01:00') < new Date() ? 'This deadline has passed. Publishing will immediately archive the post.' : 'Publish only after completing your source review.'}</p><div className="job-actions"><button className="secondary-button" disabled={Boolean(busy)} onClick={() => { setDirty(true); setConfirmed(false) }}>Return to editing</button><button className="auth-button" disabled={Boolean(busy)} onClick={() => run('publish', async () => { choosePost((await publishPost(post._id, post.revision)).data); reloadQueue(); setMessage('Post published to assistant-managed posts. Expiry is scheduled automatically.') })}>Publish approved post</button></div></>}
          {readOnly && <p>{post.status === 'archived' ? 'Expired and archived. Content and original source are preserved.' : `Published ${assistantDate(post.publishedAt)} (Africa/Lagos).`}</p>}
        </> : <form onSubmit={event => { event.preventDefault(); run('save', async () => { await saveReview(); reloadQueue(); setMessage('Review saved. Approval and publishing are still separate steps.') }) }} noValidate>
          <fieldset className="job-form-grid" disabled={Boolean(busy)}><legend className="visually-hidden">Editable extracted fields</legend>
            <div className="job-field job-field-wide"><label htmlFor="assistant-type">Post type</label><select id="assistant-type" name="postType" value={form.postType} onChange={changeMeta}>{postTypes.map(type => <option key={type}>{type}</option>)}</select></div>
            {assistantFields.map(([name, label, maximum, multiline]) => <div className={'job-field' + (multiline ? ' job-field-wide' : '')} key={name}>
              <label htmlFor={`assistant-${name}`}>{label}</label>
              {multiline ? <textarea id={`assistant-${name}`} name={name} rows={5} maxLength={maximum} value={form.fields[name]} onChange={changeField} placeholder="Not specified" aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `assistant-${name}-error` : undefined} /> : <input id={`assistant-${name}`} name={name} value={form.fields[name]} onChange={changeField} maxLength={maximum} placeholder="Not specified" aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `assistant-${name}-error` : undefined} />}
              {!form.fields[name]?.trim() && <small>Not specified</small>}{fieldErrors[name] && <span className="field-error" id={`assistant-${name}-error`}>{fieldErrors[name]}</span>}
            </div>)}
            <div className="job-field job-field-wide"><label htmlFor="assistant-deadline-date">Confirmed application deadline date</label><input id="assistant-deadline-date" name="deadlineDate" type="date" value={form.deadlineDate} onChange={changeMeta} aria-invalid={Boolean(fieldErrors.deadlineDate)} /><small>Only use a real source deadline. With no deadline, expiry is 3 months after publishing.</small>{fieldErrors.deadlineDate && <span className="field-error">{fieldErrors.deadlineDate}</span>}</div>
          </fieldset>
          <label className="assistant-confirm"><input type="checkbox" checked={confirmed} disabled={Boolean(busy)} onChange={event => setConfirmed(event.target.checked)} />I checked the source, classification, every available fact and deadline. I have not added unsupported information.</label>
          <div className="job-actions"><button className="secondary-button" type="submit" disabled={Boolean(busy)}>Save review</button><button className="auth-button" type="button" disabled={!confirmed || Boolean(busy)} onClick={() => run('approve', async () => { const saved = await saveReview(); choosePost((await approvePost(saved._id, saved.revision)).data); reloadQueue(); setMessage('Post approved. Check the final review and select Publish when ready.') })}>Approve reviewed post</button></div>
          {dirty && <button className="secondary-button assistant-discard" type="button" disabled={Boolean(busy)} onClick={() => { choosePost(post); setMessage('Unsaved edits discarded. The saved draft and source remain available.') }}>Discard unsaved edits</button>}
        </form>}
      </section><PostSources {...source} /></div>
    </>}
    <section className="panel assistant-queue" aria-labelledby="assistant-queue-title">
      <div className="section-heading"><h2 id="assistant-queue-title">Assistant-managed posts</h2><button className="secondary-button" disabled={Boolean(busy)} onClick={() => reloadQueue()}>Refresh posts</button></div>
      <div className="job-field"><label htmlFor="assistant-status">Filter post status</label><select id="assistant-status" value={queueQuery.status} disabled={Boolean(busy)} onChange={event => reloadQueue(1, event.target.value)}><option value="">All statuses</option>{['review', 'approved', 'published', 'archived'].map(status => <option key={status} value={status}>{postStatus(status)}</option>)}</select></div>
      {queue.loading ? <p role="status">Loading assistant posts…</p> : queue.error ? <><p className="field-error" role="alert">{queue.error}</p><button className="secondary-button" onClick={() => reloadQueue()}>Retry posts</button></> : <>
        {!queue.data.length ? <p>No posts in this status.</p> : <ul className="assistant-post-list">{queue.data.map(item => <li key={item._id}><div><strong>{displayFact(item.fields?.title)}</strong><span>{item.postType} · {postStatus(item.status)}{item.expiresAt ? ' · Expires ' + assistantDate(item.expiresAt) : ''}</span></div><button className="secondary-button" disabled={Boolean(busy) || dirty} onClick={() => run('open', async () => choosePost((await getAssistantPost(item._id)).data))} aria-label={`Open ${displayFact(item.fields?.title)} (${item._id.slice(-6)})`}>Open post</button></li>)}</ul>}
        {queue.pagination.totalPages > 1 && <nav className="job-pagination" aria-label="Assistant posts pagination"><button className="secondary-button" disabled={queueQuery.page <= 1 || Boolean(busy)} onClick={() => reloadQueue(queueQuery.page - 1)}>Previous</button><span>Page {queueQuery.page} of {queue.pagination.totalPages}</span><button className="secondary-button" disabled={queueQuery.page >= queue.pagination.totalPages || Boolean(busy)} onClick={() => reloadQueue(queueQuery.page + 1)}>Next</button></nav>}
      </>}
    </section>
  </>
}

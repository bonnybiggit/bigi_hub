import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import PostSources from '../components/PostSources.jsx'
import NewsDraftForm from '../components/NewsDraftForm.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { analyzePost, approvePost, deleteAssistantPost, reopenAssistantPost, verifyPublicPost, getAIConfiguration, getAssistantPost, listAssistantPosts, publishPost, savePostReview, importSportsPosts } from '../services/aiPosts.service.js'
import { assistantDate, assistantFields, displayFact, postStatus, postTypes, readFlyer } from '../utils/assistantPost.js'
import { PUBLIC_CATEGORIES, OPPORTUNITY_CATEGORIES, NEWS_CATEGORY_IDS, publicCategory, detailPath } from '../../../backend/src/config/content-categories.js'

const destinations = PUBLIC_CATEGORIES.filter(item => item.publishable).map(item => [item.id, item.label])
const categories = OPPORTUNITY_CATEGORIES
const publicSite = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://bigihub.netlify.app').replace(/\/$/, '')

export default function AIPostAssistant({ sportsOnly = false, newsCategory = '' }) {
  const pageTitle = newsCategory ? `${publicCategory(newsCategory).label} review` : sportsOnly ? 'Sports News review' : 'AI Post Assistant'
  usePageTitle(pageTitle)
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
  const [queueQuery, setQueueQuery] = useState({ page: 1, status: '', kind: newsCategory || (sportsOnly ? 'sports' : ''), revision: 0 })
  const [queue, setQueue] = useState({ loading: true, data: [], pagination: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    getAIConfiguration(controller.signal).then(response => { if (!controller.signal.aborted) setConfigured(response.data.configured) }).catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    listAssistantPosts({ page: queueQuery.page, status: queueQuery.status, kind: queueQuery.kind, limit: 10 }, controller.signal).then(response => {
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
    setQueueQuery(current => ({ ...current, page, status, revision: current.revision + 1 }))
  }
  function choosePost(value) {
    setPost(value); setForm({ destination: value.destination || '', opportunityCategory: value.opportunityCategory || '', postType: value.postType, fields: { ...value.fields }, deadlineDate: value.deadlineDate || '' })
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
  async function publishCurrent() {
    let published
    try { published = (await publishPost(post._id, post.revision)).data }
    catch (failure) { try { choosePost((await getAssistantPost(post._id)).data) } catch { /* Keep the existing view if reload also fails. */ } throw failure }
    choosePost(published); reloadQueue()
    if (published.status === 'archived') setMessage('Publication saved and archived because its deadline has passed.')
    else { try { await verifyPublicPost(published); setMessage('Published record verified through its public detail API.') } catch { setMessage('Publication saved. Public visibility could not yet be verified; check the public detail link or retry verification.') } }
  }
  async function removeAssistant(value) {
    const publicWarning = value.publicRecordId || ['published', 'archived'].includes(value.status) ? ' Any public listing will remain published or archived; this does not remove it from the public website.' : ''
    if (!window.confirm('Delete this assistant record and its original flyer permanently?' + publicWarning)) return
    await run('delete', async () => {
      const response = await deleteAssistantPost(value._id, value.revision)
      if (post?._id === value._id) newInput()
      reloadQueue(1); setMessage(response.message)
    })
  }
  const pending = post?.publicationState === 'pending'
  const importedSports = post?.sourceMetadata?.category === 'sports'
  const manualNews = post?.sourceMetadata?.provider === 'manual' && NEWS_CATEGORY_IDS.includes(post?.sourceMetadata?.category)
  const isArticle = importedSports || manualNews || form?.destination === 'sports' || NEWS_CATEGORY_IDS.includes(form?.destination)
  const reviewFields = isArticle ? [['title', 'Title', 500], ['description', 'Short summary (maximum 600 characters)', 600, true]] : assistantFields
  const readOnly = post && (pending || ['published', 'archived'].includes(post.status))
  const approved = post?.status === 'approved' && !dirty && !pending
  const approvalBlock = !form?.destination ? 'Select a public destination before approval.' : form.destination === 'opportunities' && !form.opportunityCategory ? 'Select an opportunity category before approval.' : !confirmed ? 'Confirm your source review before approval. Editing or saving the review requires confirmation again.' : ''
  const step = busy === 'analyze' ? 1 : !post ? 0 : readOnly ? 4 : approved ? 3 : 2
  const source = post ? { text: post.sourceText, image: isArticle ? null : post.sourceImage, imageText: post.imageText, evidence: post.evidence, metadata: post.sourceMetadata } : { text: sourceText, image }
  return <>
    <PageHeader title={pageTitle} description="Review source facts, approve the reviewed draft, then publish when ready." />
    {!newsCategory && <section className="panel" aria-labelledby="sports-import-title">
      <h2 id="sports-import-title">Collect sports stories</h2>
      <p>Import up to three top stories from The News API into the review queue. Importing never approves or publishes a story.</p>
      <button className="auth-button" type="button" disabled={Boolean(busy) || dirty} onClick={() => run('import-sports', async () => {
        const response = await importSportsPosts()
        const { imported, duplicates, skipped } = response.data
        reloadQueue(1, 'review')
        setQueueQuery(current => ({ ...current, kind: 'sports' }))
        setMessage(`${imported} sports ${imported === 1 ? 'story' : 'stories'} imported for review. ${duplicates} duplicates, ${skipped} skipped. Nothing was approved or published.`)
      })}>{busy === 'import-sports' ? 'Importing sports stories...' : 'Import sports stories'}</button>
      {dirty && <p>Save or discard your current review edits before importing.</p>}
    </section>}
    <ol className="assistant-steps" aria-label="Post workflow">{(newsCategory ? ['Enter draft', 'Save draft', 'Review / Edit', 'Approve', 'Publish'] : ['Upload / Paste', 'Analyze', 'Review / Edit', 'Approve', 'Publish']).map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}>{index + 1}. {label}</li>)}</ol>
    <p className="assistant-note">AI never publishes automatically. Missing facts are shown as “Not specified”. Check every extraction against its source.</p>
    {error && <div className="job-notice field-error" role="alert"><p>{error}</p>{Object.entries(fieldErrors).map(([field, detail]) => detail && <p key={field}>{field}: {detail}</p>)}{error.includes('post changed') && post && <button className="secondary-button" disabled={Boolean(busy)} onClick={() => run('open', async () => { choosePost((await getAssistantPost(post._id)).data); setMessage('Latest post loaded. Review your changes again.') })}>Reload post</button>}</div>}
    {message && <p className="job-notice" role="status">{message}</p>}
    {busy && <p role="status">{busy === 'analyze' ? 'Analyzing source content…' : busy === 'image' ? 'Reading image…' : 'Saving / loading post…'}</p>}
    {!post ? newsCategory ? <NewsDraftForm category={newsCategory} busy={busy} run={run} onCreated={value => { choosePost(value); reloadQueue(1, 'review'); setMessage('News draft saved for review. Nothing has been approved or published.') }} /> : <section className="panel" aria-labelledby="assistant-input-title">
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
      <div className="section-heading"><h2 ref={reviewHeading} tabIndex={-1}>{pending ? 'Publication pending' : readOnly ? 'Published post' : approved ? 'Approved — ready to publish' : 'Review and edit extracted content'}</h2><button className="secondary-button" disabled={Boolean(busy) || dirty} onClick={newInput}>New input</button></div>
      <div className="job-actions"><button className="secondary-button" disabled={Boolean(busy) || pending} onClick={() => removeAssistant(post)}>Delete assistant record only</button></div>
      <p className="assistant-note">{isArticle && `${publicCategory(form?.destination || post.destination || post.sourceMetadata?.category || 'sports').label} · `}Status: {postStatus(post.status)}{dirty ? ' — unsaved changes; approval must be repeated' : ''}. Original source is retained with this post.</p>
      {post.warnings?.length > 0 && <details className="panel assistant-warnings" open><summary>Review notes</summary><ul>{post.warnings.filter(warning => !isArticle || !warning.includes('No sports publishing destination exists')).map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
      <div className="assistant-review-layout"><section className="panel" aria-label="Post review">
        {readOnly || approved ? <>
          <h3>{displayFact(post.fields.title)}</h3>
          <dl className="assistant-facts"><div><dt>Public destination</dt><dd>{displayFact(post.destination)}</dd></div><div><dt>Post type</dt><dd>{post.postType}</dd></div>{reviewFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{displayFact(post.fields[key])}</dd></div>)}{!isArticle && <div><dt>Confirmed deadline date</dt><dd>{displayFact(post.deadlineDate)}</dd></div>}<div><dt>Expiry</dt><dd>{isArticle ? 'News archive; no application deadline' : post.expiresAt ? assistantDate(post.expiresAt) + ' (Africa/Lagos)' : post.deadlineDate ? post.deadlineDate + ' at end of day (Africa/Lagos)' : '3 calendar months after publishing'}</dd></div></dl>
          <p>{isArticle ? 'News stories publish separately with a short summary, original publisher attribution and link. Publisher dates are not application deadlines.' : 'The selected destination determines the public collection, independently of AI classification. Opportunities also require an explicitly selected category. The reviewed location must include a supported country from the source.'}</p>
          {approved && <><p>{post.deadlineDate && new Date(post.deadlineDate + 'T23:59:59.999+01:00') < new Date() ? 'This deadline has passed. Publishing will immediately archive the post.' : 'Publish only after completing your source review.'}</p><div className="job-actions"><button className="secondary-button" disabled={Boolean(busy)} onClick={() => { setDirty(true); setConfirmed(false) }}>Return to editing</button><button className="auth-button" disabled={Boolean(busy)} onClick={() => run('publish', publishCurrent)}>Publish approved post</button></div></>}
          {readOnly && !pending && !post.publicRecordId && <><p>This older assistant publication has no stored public link. Return it to review to select a public destination and approve again.</p><button className="secondary-button" disabled={Boolean(busy)} onClick={() => { if (window.confirm('Return this assistant-only publication to review? Its original flyer is retained. A new review and approval will be required.')) run('reopen', async () => { const response = await reopenAssistantPost(post._id, post.revision); choosePost(response.data); reloadQueue(); setMessage(response.message) }) }}>Return assistant-only publication to review</button></>}
          {pending && <><p role="status">Publication is pending. Its destination and record link are saved; resume to finish safely before deleting or editing.</p><button className="auth-button" disabled={Boolean(busy)} onClick={() => run('publish', publishCurrent)}>Resume publication</button></>}
          {post.publicRecordId && <p>Public record: {post.publicRecordId}. <a href={publicSite + detailPath(post.destination, post.publicSlug)} target="_blank" rel="noreferrer">Open public detail page</a>. Deleting this assistant record does not remove that public listing.</p>}
          {post.publicRecordId && !pending && post.status === 'published' && <button className="secondary-button" disabled={Boolean(busy)} onClick={() => run('verify', async () => { await verifyPublicPost(post); setMessage('Public detail API verified.') })}>Verify public record</button>}
          {readOnly && <p>{post.status === 'archived' ? 'Expired and archived. Content and original source are preserved.' : `Published ${assistantDate(post.publishedAt)} (Africa/Lagos).`}</p>}
        </> : <form onSubmit={event => { event.preventDefault(); run('save', async () => { await saveReview(); reloadQueue(); setMessage('Review saved. Approval and publishing are still separate steps.') }) }} noValidate>
          <fieldset className="job-form-grid" disabled={Boolean(busy)}><legend className="visually-hidden">Editable extracted fields</legend>
            <div className="job-field job-field-wide"><label htmlFor="assistant-destination">Public destination (required)</label><select id="assistant-destination" name="destination" value={form.destination} onChange={event => { changeMeta(event); setForm(current => ({ ...current, opportunityCategory: '' })) }} aria-invalid={Boolean(fieldErrors.destination)}><option value="">Select a public destination</option>{destinations.filter(([value]) => importedSports ? value === 'sports' : manualNews ? value === post.sourceMetadata.category : true).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{fieldErrors.destination && <span className="field-error">{fieldErrors.destination}</span>}</div>
            {form.destination === 'opportunities' && <div className="job-field job-field-wide"><label htmlFor="assistant-category">Public opportunity category (required)</label><select id="assistant-category" name="opportunityCategory" value={form.opportunityCategory} onChange={changeMeta} aria-invalid={Boolean(fieldErrors.opportunityCategory)}><option value="">Select category</option>{categories.map(category => <option key={category}>{category}</option>)}</select>{fieldErrors.opportunityCategory && <span className="field-error">{fieldErrors.opportunityCategory}</span>}</div>}
            {!isArticle && <div className="job-field job-field-wide"><label htmlFor="assistant-type">Post type</label><select id="assistant-type" name="postType" value={form.postType} onChange={changeMeta}>{postTypes.map(type => <option key={type}>{type}</option>)}</select></div>}
            {reviewFields.map(([name, label, maximum, multiline]) => <div className={'job-field' + (multiline ? ' job-field-wide' : '')} key={name}>
              <label htmlFor={`assistant-${name}`}>{label}</label>
              {multiline ? <textarea id={`assistant-${name}`} name={name} rows={5} maxLength={maximum} value={form.fields[name]} onChange={changeField} placeholder="Not specified" aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `assistant-${name}-error` : undefined} /> : <input id={`assistant-${name}`} name={name} value={form.fields[name]} onChange={changeField} maxLength={maximum} placeholder="Not specified" aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `assistant-${name}-error` : undefined} />}
              {!form.fields[name]?.trim() && <small>Not specified</small>}{fieldErrors[name] && <span className="field-error" id={`assistant-${name}-error`}>{fieldErrors[name]}</span>}
            </div>)}
            {!isArticle && <div className="job-field job-field-wide"><label htmlFor="assistant-deadline-date">Confirmed application deadline date</label><input id="assistant-deadline-date" name="deadlineDate" type="date" value={form.deadlineDate} onChange={changeMeta} aria-invalid={Boolean(fieldErrors.deadlineDate)} /><small>Only use a real source deadline. With no deadline, expiry is 3 months after publishing.</small>{fieldErrors.deadlineDate && <span className="field-error">{fieldErrors.deadlineDate}</span>}</div>}
          </fieldset>
          <label className="assistant-confirm"><input type="checkbox" checked={confirmed} disabled={Boolean(busy)} onChange={event => setConfirmed(event.target.checked)} />{isArticle ? 'I checked the original publisher and attribution, verified reuse rights for this short summary, and added no full article copy or images.' : 'I checked the source, classification, every available fact and deadline. I have not added unsupported information.'}</label>
          {approvalBlock && <p role="status">{approvalBlock}</p>}
          <div className="job-actions"><button className="secondary-button" type="submit" disabled={Boolean(busy)}>Save review</button><button className="auth-button" type="button" disabled={!confirmed || !form.destination || (form.destination === 'opportunities' && !form.opportunityCategory) || Boolean(busy)} onClick={() => run('approve', async () => { const saved = await saveReview(); choosePost((await approvePost(saved._id, saved.revision)).data); reloadQueue(); setMessage('Post approved. Check the final review and select Publish when ready.') })}>Approve reviewed post</button></div>
          {dirty && <button className="secondary-button assistant-discard" type="button" disabled={Boolean(busy)} onClick={() => { choosePost(post); setMessage('Unsaved edits discarded. The saved draft and source remain available.') }}>Discard unsaved edits</button>}
        </form>}
      </section><PostSources {...source} /></div>
    </>}
    <section className="panel assistant-queue" aria-labelledby="assistant-queue-title">
      <div className="section-heading"><h2 id="assistant-queue-title">Assistant-managed posts</h2><button className="secondary-button" disabled={Boolean(busy)} onClick={() => reloadQueue()}>Refresh posts</button></div>
      {!newsCategory && <label className="assistant-confirm"><input type="checkbox" checked={queueQuery.kind === 'sports'} disabled={Boolean(busy)} onChange={event => { setQueue(current => ({ ...current, loading: true })); setQueueQuery(current => ({ ...current, page: 1, kind: event.target.checked ? 'sports' : '', revision: current.revision + 1 })) }} />Sports stories only</label>}<div className="job-field"><label htmlFor="assistant-status">Filter post status</label><select id="assistant-status" value={queueQuery.status} disabled={Boolean(busy)} onChange={event => reloadQueue(1, event.target.value)}><option value="">All statuses</option>{['review', 'approved', 'published', 'archived'].map(status => <option key={status} value={status}>{postStatus(status)}</option>)}</select></div>
      {queue.loading ? <p role="status">Loading assistant posts…</p> : queue.error ? <><p className="field-error" role="alert">{queue.error}</p><button className="secondary-button" onClick={() => reloadQueue()}>Retry posts</button></> : <>
        {!queue.data.length ? <p>No posts in this status.</p> : <ul className="assistant-post-list">{queue.data.map(item => <li key={item._id}><div><strong>{displayFact(item.fields?.title)}</strong><span>{['sports', ...NEWS_CATEGORY_IDS].includes(item.sourceMetadata?.category) ? publicCategory(item.sourceMetadata.category).label : item.postType} · {postStatus(item.status)}{item.expiresAt ? ' · Expires ' + assistantDate(item.expiresAt) : ''}</span></div><button className="secondary-button" disabled={Boolean(busy) || dirty} onClick={() => run('open', async () => choosePost((await getAssistantPost(item._id)).data))} aria-label={`Open ${displayFact(item.fields?.title)} (${item._id.slice(-6)})`}>Open post</button><button className="secondary-button" disabled={Boolean(busy) || dirty || item.publicationState === 'pending'} onClick={() => removeAssistant(item)}>Delete assistant only</button></li>)}</ul>}
        {queue.pagination.totalPages > 1 && <nav className="job-pagination" aria-label="Assistant posts pagination"><button className="secondary-button" disabled={queueQuery.page <= 1 || Boolean(busy)} onClick={() => reloadQueue(queueQuery.page - 1)}>Previous</button><span>Page {queueQuery.page} of {queue.pagination.totalPages}</span><button className="secondary-button" disabled={queueQuery.page >= queue.pagination.totalPages || Boolean(busy)} onClick={() => reloadQueue(queueQuery.page + 1)}>Next</button></nav>}
      </>}
    </section>
  </>
}

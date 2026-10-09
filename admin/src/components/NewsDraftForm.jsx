import { useState } from 'react'
import { apiRequest } from '../services/apiClient.js'
import { publicCategory } from '../../../backend/src/config/content-categories.js'

export default function NewsDraftForm({ category, busy, run, onCreated }) {
  const [fields, setFields] = useState({ title: '', summary: '', sourceName: '', sourceUrl: '', sourcePublishedAt: '' })
  return <section className="panel" aria-labelledby="news-draft-title">
    <h2 id="news-draft-title">Add a {publicCategory(category).label.toLowerCase()} draft</h2>
    <p>Write a short summary you have permission to reuse and link to the original publisher. Creating a draft never approves or publishes it.</p>
    <form onSubmit={event => { event.preventDefault(); run('create-news', async () => {
      const response = await apiRequest('admin/ai-posts/news-drafts', { method: 'POST', body: { category, ...fields } })
      onCreated(response.data)
    }) }}>
      <fieldset className="job-form-grid" disabled={Boolean(busy)}><legend className="visually-hidden">News draft details</legend>
        {[
          ['title', 'Title', 'text', 500], ['summary', 'Short summary', 'textarea', 600],
          ['sourceName', 'Original publisher', 'text', 500], ['sourceUrl', 'Original article URL', 'url', 2000],
          ['sourcePublishedAt', 'Original publication date', 'date'],
        ].map(([name, label, type, maxLength]) => <div className="job-field job-field-wide" key={name}><label htmlFor={`news-${name}`}>{label}</label>{type === 'textarea' ? <textarea id={`news-${name}`} value={fields[name]} required maxLength={maxLength} rows={4} onChange={event => setFields(current => ({ ...current, [name]: event.target.value }))} /> : <input id={`news-${name}`} type={type} value={fields[name]} required maxLength={maxLength} onChange={event => setFields(current => ({ ...current, [name]: event.target.value }))} />}</div>)}
      </fieldset>
      <button className="auth-button" disabled={Boolean(busy)} type="submit">{busy === 'create-news' ? 'Saving draft...' : 'Save draft for review'}</button>
    </form>
  </section>
}

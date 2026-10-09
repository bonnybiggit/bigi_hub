import { PUBLIC_CATEGORIES, detailPath } from '../config/contentCategories.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Search as SearchIcon } from 'lucide-react'
import Pagination from '../components/Pagination.jsx'
import { getJobs } from '../services/jobs.service.js'
import { getOpportunities } from '../services/opportunities.service.js'
import { getScholarships } from '../services/scholarships.service.js'
import '../styles/home.css'
import '../styles/search.css'

const fetchers = { jobs: getJobs, opportunities: getOpportunities, scholarships: getScholarships }
const groups = PUBLIC_CATEGORIES.map(item => {
  if (!fetchers[item.id]) throw new Error(`Missing search service for ${item.id}`)
  return { key: item.id, title: item.label, type: item.singular, fetch: fetchers[item.id] }
})
const LIMIT = 9

function SearchResults({ query, onReset }) {
  const [pages, setPages] = useState({ jobs: 1, opportunities: 1, scholarships: 1 })
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const heading = useRef(null)
  const requestKey = JSON.stringify([query, pages, attempt])
  useEffect(() => {
    if (!query || query.length > 200) return
    const controller = new AbortController()
    const [search, currentPages] = JSON.parse(requestKey)
    Promise.allSettled(groups.map(async group => {
      const response = await group.fetch({ search, page: currentPages[group.key], limit: LIMIT }, { signal: controller.signal })
      if (response.status !== 'ok' || !Array.isArray(response.data) || !Number.isInteger(response.pagination?.total) || !Number.isInteger(response.pagination?.totalPages)) throw new Error('Invalid search response')
      return response
    })).then(results => {
      if (!controller.signal.aborted) setState({ requestKey, results })
    })
    return () => controller.abort()
  }, [query, requestKey])

  if (!query) return <div className="search-state"><h2>Search Bigi_Hub</h2><p>Enter a title, organization, location or keyword to find jobs, opportunities and scholarships.</p></div>
  if (query.length > 200) return <div className="search-state" role="alert"><h2>Search is too long</h2><p>Use 200 characters or fewer.</p><button className="home-button home-button-secondary" type="button" onClick={onReset}>Reset search</button></div>
  if (state?.requestKey !== requestKey) return <div className="search-state" role="status">Searching Jobs, Opportunities and Scholarships...</div>

  const failed = state.results.some(result => result.status === 'rejected')
  const total = state.results.reduce((count, result) => count + (result.status === 'fulfilled' ? result.value.pagination.total : 0), 0)
  return <section aria-labelledby="search-results-title">
    <div className="search-results-heading"><h2 id="search-results-title" tabIndex={-1} ref={heading}>Results for “{query}”</h2><p role="status">{total} {failed ? 'available ' : ''}{total === 1 ? 'result' : 'results'}</p></div>
    {failed && <div className="search-state" role="alert"><h3>Some results could not be loaded</h3><p>Please retry to search all content types.</p><button className="home-button home-button-primary" type="button" onClick={() => setAttempt(current => current + 1)}>Retry</button></div>}
    {!failed && total === 0 && <div className="search-state"><h3>No results found</h3><p>Try a broader keyword, an organization name or a different location.</p><button className="home-button home-button-secondary" type="button" onClick={onReset}>Reset search</button></div>}
    {groups.map((group, index) => {
      const result = state.results[index]
      return <section className="search-group" aria-labelledby={'search-' + group.key} key={group.key}>
        <h3 id={'search-' + group.key}>{group.title}{result.status === 'fulfilled' && ` (${result.value.pagination.total})`}</h3>
        {result.status === 'rejected' ? <p>Unable to load {group.title.toLowerCase()}. Use Retry above.</p> : <>
          {result.value.data.length === 0 && <p>No {group.title.toLowerCase()} found for this search.</p>}
          <ul className="search-result-grid">{result.value.data.map(item => <li className="search-result" key={item._id ?? item.id ?? item.slug}>
            <span className="home-tag">{group.type}</span>
            <h4><Link to={detailPath(group.key, item.slug)}>{item.title || 'Not specified'}</Link></h4>
            {item.organization && <p>{item.organization}</p>}
            <dl>{item.location && <div><dt>Location</dt><dd>{item.location}</dd></div>}{item.category && <div><dt>Category</dt><dd>{item.category}</dd></div>}{item.level && <div><dt>Study level</dt><dd>{item.level}</dd></div>}</dl>
            <Link className="home-text-link" to={detailPath(group.key, item.slug)}>View {group.type.toLowerCase()}<ArrowRight size={18} aria-hidden="true" /></Link>
          </li>)}</ul>
          <Pagination currentPage={pages[group.key]} totalPages={result.value.pagination.totalPages} label={group.title + ' search result pages'} onPageChange={page => {
            setPages(current => ({ ...current, [group.key]: page }))
            heading.current?.focus({ preventScroll: true })
          }} />
        </>}
      </section>
    })}
  </section>
}

function SearchForm({ query, onSearch, inputRef }) {
  const [input, setInput] = useState(query)
  return <form className="global-search-form" role="search" onSubmit={event => { event.preventDefault(); onSearch(input.trim()) }}>
    <label htmlFor="global-search">Search Jobs, Opportunities and Scholarships</label>
    <div><input id="global-search" ref={inputRef} type="search" maxLength={200} placeholder="Title, organization, location or keyword" value={input} onChange={event => setInput(event.target.value)} /><button className="home-button home-button-primary" type="submit"><SearchIcon size={18} aria-hidden="true" />Search</button></div>
  </form>
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') || '').trim()
  const inputRef = useRef(null)
  function reset() { setParams({}); inputRef.current?.focus() }
  return <div className="search-page">
    <header className="search-hero"><p className="home-eyebrow">Explore Bigi_Hub</p><h1>Find your next opportunity</h1><p>Search jobs, opportunities and scholarships in one place.</p>
      <SearchForm key={query} query={query} inputRef={inputRef} onSearch={value => setParams(value ? { q: value } : {})} />
    </header>
    <SearchResults key={query} query={query} onReset={reset} />
  </div>
}

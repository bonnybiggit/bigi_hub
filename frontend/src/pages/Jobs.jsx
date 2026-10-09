import { detailPath } from '../config/contentCategories.js'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Search, SlidersHorizontal, Mail } from 'lucide-react'
import OpportunityCard from '../components/OpportunityCard.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import Pagination from '../components/Pagination.jsx'
import { jobArticles, jobFilterFields, filterAndSortJobs } from '../data/jobs.js'
import useJobs from '../hooks/useJobs.js'
import '../styles/home.css'
import '../styles/jobs.css'

const JOBS_PER_PAGE = 9

function Jobs({ savedJobIds, onSaveJob }) {
  const { jobs, loading, error, retry } = useJobs()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const resultsHeading = useRef(null)
  const results = filterAndSortJobs(jobs, query, filters, sort)
  const totalPages = Math.ceil(results.length / JOBS_PER_PAGE)
  const currentPage = Math.min(page, Math.max(1, totalPages))
  const startIndex = (currentPage - 1) * JOBS_PER_PAGE
  const visibleJobs = results.slice(startIndex, startIndex + JOBS_PER_PAGE)

  function clearFilters() {
    setSearchInput('')
    setQuery('')
    setFilters({})
    setSort('newest')
    setPage(1)
  }

  function changePage(nextPage) {
    setPage(nextPage)
    resultsHeading.current?.focus({ preventScroll: true })
    resultsHeading.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="jobs-page">
      <section className="jobs-hero" aria-labelledby="jobs-title">
        <p className="home-eyebrow">Nigeria & Africa first</p>
        <h1 id="jobs-title">Find Your Next Opportunity</h1>
        <p>Discover jobs, internships and career opportunities in Nigeria and across Africa.</p>
        <form className="jobs-search" role="search" onSubmit={(event) => {
          event.preventDefault()
          setQuery(searchInput)
          setPage(1)
        }}>
          <label className="jobs-search-label" htmlFor="job-search">Search opportunities</label>
          <div className="jobs-search-fields">
            <input id="job-search" type="search" placeholder="Search jobs, companies, or keywords..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            <button type="submit" className="home-button home-button-primary"><Search size={18} aria-hidden="true" />Search</button>
          </div>
        </form>
        <p className="jobs-note">Remote roles are based in the African location shown. Saved jobs last until you reload.</p>
      </section>

      <div className="jobs-layout" aria-label="Jobs layout">
        <aside className="jobs-filter-column" aria-label="Filter jobs">
          <section className="jobs-filters" aria-labelledby="jobs-filter-title">
            <div className="jobs-filter-heading">
              <h2 id="jobs-filter-title"><SlidersHorizontal size={20} aria-hidden="true" />Refine your search</h2>
              <button className="jobs-clear" type="button" onClick={clearFilters}>Clear filters</button>
            </div>
            <div className="jobs-filter-grid">
              {jobFilterFields.map(({ key, label, options }) => (
                <div className="jobs-field" key={key}>
                  <label htmlFor={`filter-${key}`}>{label}</label>
                  <select id={`filter-${key}`} value={filters[key] || ''} onChange={(event) => {
                    setFilters((current) => ({ ...current, [key]: event.target.value }))
                    setPage(1)
                  }}>
                    <option value="">All</option>
                    {options.map(({ value, label: optionLabel }) => <option key={value} value={value}>{optionLabel}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="jobs-listing-column">
          <div className="jobs-results-heading">
            <div>
              <h2 id="jobs-results-title" tabIndex={-1} ref={resultsHeading}>Latest Jobs</h2>
              <p role="status">
                {loading ? 'Loading jobs...' : error ? 'Jobs could not be loaded.' : <>
                  {results.length} {results.length === 1 ? 'result' : 'results'}{query && ` for "${query}"`}
                  {results.length > 0 && ` | Showing ${startIndex + 1}-${startIndex + visibleJobs.length}`}
                </>}
              </p>
            </div>
            <div className="jobs-field">
              <label htmlFor="jobs-sort">Sort by</label>
              <select id="jobs-sort" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
                <option value="newest">Newest</option>
                <option value="deadline">Deadline soonest</option>
                <option value="title">Title A-Z</option>
              </select>
            </div>
          </div>

          <section className="jobs-results" aria-labelledby="jobs-results-title" aria-busy={loading}>
            {loading && <div className="jobs-empty" role="status"><p>Loading jobs...</p></div>}
            {error && <div className="jobs-empty" role="alert"><h3>Unable to load jobs</h3><p>{error}</p><button className="home-button home-button-primary" type="button" onClick={retry}>Try again</button></div>}
            <div className="jobs-list">
              {visibleJobs.map((job) => (
                <OpportunityCard key={job.id} {...job} compact category={job.jobType}
                  to={detailPath('jobs', job.slug)} cta="View Job" saved={savedJobIds.includes(job.id)} onSave={() => onSaveJob(job.id)} />
              ))}
            </div>
            {!loading && !error && results.length === 0 && (
              <div className="jobs-empty">
                <Search size={32} aria-hidden="true" />
                <h3>No opportunities found</h3>
                <p>Try another keyword or broaden your filters.</p>
                <button className="home-button home-button-primary" type="button" onClick={clearFilters}>Clear filters</button>
              </div>
            )}
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} label="Job result pages" />
          </section>
        </main>

        <aside className="jobs-sidebar" aria-label="More from Bigi_Hub">
          <section className="jobs-sidebar-panel jobs-sidebar-articles" aria-labelledby="jobs-articles-title">
            <div className="jobs-sidebar-heading">
              <h2 id="jobs-articles-title">Latest Articles</h2>
              <a className="jobs-view-all" href="/#home-articles-title" aria-label="View all articles">View all <ArrowRight size={14} aria-hidden="true" /></a>
            </div>
            <p className="jobs-note">Sample career guides</p>
            {jobArticles.map((article) => <ArticleCard key={article.id} {...article} />)}
          </section>

          <section className="jobs-sidebar-panel" aria-labelledby="jobs-featured-title">
            <div className="jobs-sidebar-heading">
              <h2 id="jobs-featured-title">Featured Opportunities</h2>
              <Link className="jobs-view-all" to="/opportunities" aria-label="View all opportunities">View all <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            <ul className="jobs-featured-list">
              {jobs.slice(0, 3).map((job) => (
                <li key={job.id}>
                  <Building2 size={18} aria-hidden="true" />
                  <div>
                    <Link to={detailPath('jobs', job.slug)}>{job.title}</Link>
                    <p>{job.jobType}{job.isDemo && ' / Demo'}</p>
                    <p>{job.location}</p>
                  </div>
                  <ArrowRight size={14} aria-hidden="true" />
                </li>
              ))}
            </ul>
          </section>

          <section className="jobs-sidebar-panel" aria-labelledby="jobs-newsletter-title">
            <Mail size={24} aria-hidden="true" />
            <h2 id="jobs-newsletter-title">Stay in the loop</h2>
            <p>Get the latest jobs, scholarships and opportunities delivered to your inbox.</p>
            <form className="jobs-newsletter" onSubmit={(event) => {
              event.preventDefault()
              setNewsletterMessage('Sign-ups are coming soon. Your email has not been sent or saved.')
            }}>
              <label htmlFor="jobs-email">Email address</label>
              <input id="jobs-email" type="email" autoComplete="email" placeholder="you@example.com" aria-describedby="jobs-newsletter-note" required />
              <button type="submit" className="home-button home-button-primary">Subscribe</button>
              <p id="jobs-newsletter-note" className="jobs-note">Preview only. No email is sent or saved.</p>
              <p role="status" className="jobs-note">{newsletterMessage}</p>
            </form>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Jobs

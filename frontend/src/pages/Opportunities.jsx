import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Mail, Search, SlidersHorizontal } from 'lucide-react'
import OpportunityCard from '../components/OpportunityCard.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import Pagination from '../components/Pagination.jsx'
import {
  opportunityArticles,
  opportunityCategories,
  opportunityFilterFields,
  filterAndSortOpportunities,
} from '../data/opportunities.js'
import useOpportunities from '../hooks/useOpportunities.js'
import '../styles/home.css'
import '../styles/opportunities.css'

const OPPORTUNITIES_PER_PAGE = 9

const categoryIcons = {
  Scholarships: '🎓',
  Grants: '💰',
  Fellowships: '🤝',
  Internships: '🌱',
  'Graduate Programs': '📘',
  Training: '🛠️',
  Competitions: '🏆',
  Volunteering: '🤲',
}

function Opportunities({ savedOpportunityIds = [], onSaveOpportunity = () => {} }) {
  const { opportunities, loading, error, retry } = useOpportunities()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [activeCategory, setActiveCategory] = useState('All')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const resultsHeading = useRef(null)

  const results = useMemo(() => {
    const relevant = activeCategory === 'All'
      ? opportunities
      : opportunities.filter((opportunity) => opportunity.category === activeCategory)

    return filterAndSortOpportunities(relevant, query, filters, sort)
  }, [opportunities, activeCategory, filters, query, sort])

  const totalPages = Math.ceil(results.length / OPPORTUNITIES_PER_PAGE)
  const currentPage = Math.min(page, Math.max(1, totalPages || 1))
  const startIndex = (currentPage - 1) * OPPORTUNITIES_PER_PAGE
  const visibleOpportunities = results.slice(startIndex, startIndex + OPPORTUNITIES_PER_PAGE)

  function clearFilters() {
    setSearchInput('')
    setQuery('')
    setFilters({})
    setSort('newest')
    setPage(1)
    setActiveCategory('All')
  }

  function changePage(nextPage) {
    setPage(nextPage)
    resultsHeading.current?.focus({ preventScroll: true })
    resultsHeading.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="opportunities-page">
      <section className="opportunities-hero" aria-labelledby="opportunities-title">
        <p className="home-eyebrow">Nigeria & Africa first</p>
        <h1 id="opportunities-title">Discover Opportunities</h1>
        <p>
          Explore scholarships, grants, fellowships, internships, training, competitions and other opportunities designed for learners, founders and professionals across Nigeria and Africa.
        </p>
        <form className="opportunities-search" role="search" onSubmit={(event) => {
          event.preventDefault()
          setQuery(searchInput)
          setPage(1)
        }}>
          <label className="opportunities-search-label" htmlFor="opportunity-search">Search opportunities</label>
          <div className="opportunities-search-fields">
            <input id="opportunity-search" type="search" placeholder="Search opportunities, organizations or keywords..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            <button type="submit" className="home-button home-button-primary"><Search size={18} aria-hidden="true" />Search</button>
          </div>
        </form>
      </section>

      <div className="opportunities-layout" aria-label="Opportunities layout">
        <aside className="opportunities-filter-column" aria-label="Refine opportunities">
          <section className="opportunities-filters" aria-labelledby="opportunities-filter-title">
            <div className="opportunities-filter-heading">
              <h2 id="opportunities-filter-title"><SlidersHorizontal size={20} aria-hidden="true" />Refine your search</h2>
              <button className="opportunities-clear" type="button" onClick={clearFilters}>Clear filters</button>
            </div>
            <div className="opportunities-filter-grid">
              <div className="opportunities-field opportunity-category-picker">
                <label htmlFor="opportunity-category-select">Category</label>
                <select id="opportunity-category-select" value={activeCategory} onChange={(event) => { setActiveCategory(event.target.value); setPage(1) }}>
                  <option value="All">🌍 All categories</option>
                  {opportunityCategories.map((category) => (
                    <option key={category} value={category}>{categoryIcons[category]} {category}</option>
                  ))}
                </select>
              </div>

              {opportunityFilterFields.map(({ key, label, options }) => (
                <div className="opportunities-field" key={key}>
                  <label htmlFor={`opportunity-filter-${key}`}>{label}</label>
                  <select id={`opportunity-filter-${key}`} value={filters[key] || ''} onChange={(event) => {
                    setFilters((current) => ({ ...current, [key]: event.target.value }))
                    setPage(1)
                  }}>
                    <option value="">All</option>
                    {options.map(({ value, label: optionLabel }) => (
                      <option key={value} value={value}>{optionLabel}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="opportunities-listing-column">
          <div className="opportunities-results-heading">
            <div>
              <h2 id="opportunities-results-title" tabIndex={-1} ref={resultsHeading}>Latest Opportunities</h2>
              <p role="status">
                {loading ? 'Loading opportunities...' : error ? 'Opportunities could not be loaded.' : <>
                  {results.length} {results.length === 1 ? 'result' : 'results'}{query && ` for "${query}"`}
                  {results.length > 0 && ` | Showing ${startIndex + 1}-${startIndex + visibleOpportunities.length}`}
                </>}
              </p>
            </div>
            <div className="opportunities-field">
              <label htmlFor="opportunities-sort">Sort by</label>
              <select id="opportunities-sort" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
                <option value="newest">Newest</option>
                <option value="deadline">Deadline soonest</option>
                <option value="title">Title A-Z</option>
              </select>
            </div>
          </div>

          <section className="opportunities-results" aria-labelledby="opportunities-results-title" aria-busy={loading}>
            {loading && <div className="opportunities-empty" role="status"><p>Loading opportunities...</p></div>}
            {error && <div className="opportunities-empty" role="alert"><h3>Unable to load opportunities</h3><p>{error}</p><button className="home-button home-button-primary" type="button" onClick={retry}>Try again</button></div>}
            <div className="opportunities-list">
              {visibleOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  {...opportunity}
                  compact
                  category={opportunity.category}
                  location={opportunity.location}
                  workType={opportunity.eligibility}
                  compensation={opportunity.benefit || opportunity.funding}
                  to={`/opportunities/${opportunity.slug}`}
                  cta="View Opportunity"
                  saved={savedOpportunityIds.includes(opportunity.id)}
                  onSave={() => onSaveOpportunity(opportunity.id)}
                />
              ))}
            </div>

            {!loading && !error && results.length === 0 && (
              <div className="opportunities-empty">
                <Search size={32} aria-hidden="true" />
                <h3>No opportunities found</h3>
                <p>Try another keyword or broaden your filters.</p>
                <button className="home-button home-button-primary" type="button" onClick={clearFilters}>Clear filters</button>
              </div>
            )}

            <Pagination currentPage={currentPage} totalPages={totalPages || 1} onPageChange={changePage} label="Opportunity result pages" />
          </section>
        </main>

        <aside className="opportunities-sidebar" aria-label="More from Bigi_Hub">
          <section className="opportunities-sidebar-panel opportunities-sidebar-articles" aria-labelledby="opportunities-articles-title">
            <div className="opportunities-sidebar-heading">
              <h2 id="opportunities-articles-title">Latest Articles</h2>
              <a className="opportunities-view-all" href="/#home-articles-title" aria-label="View all articles">View all <ArrowRight size={14} aria-hidden="true" /></a>
            </div>
            <p className="opportunities-note">Sample career guides</p>
            {opportunityArticles.map((article) => <ArticleCard key={article.id} {...article} />)}
          </section>

          <section className="opportunities-sidebar-panel" aria-labelledby="opportunities-featured-title">
            <div className="opportunities-sidebar-heading">
              <h2 id="opportunities-featured-title">Featured Opportunities</h2>
              <Link className="opportunities-view-all" to="/opportunities" aria-label="View all opportunities">View all <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            <ul className="opportunities-featured-list">
              {opportunities.slice(0, 3).map((opportunity) => (
                <li key={opportunity.id}>
                  <Building2 size={18} aria-hidden="true" />
                  <div>
                    <Link to={`/opportunities/${opportunity.slug}`}>{opportunity.title}</Link>
                    <p>{opportunity.category}{opportunity.isDemo && ' / Demo'}</p>
                    <p>{opportunity.location}</p>
                  </div>
                  <ArrowRight size={14} aria-hidden="true" />
                </li>
              ))}
            </ul>
          </section>

          <section className="opportunities-sidebar-panel" aria-labelledby="opportunities-newsletter-title">
            <Mail size={24} aria-hidden="true" />
            <h2 id="opportunities-newsletter-title">Stay in the loop</h2>
            <p>Get the latest jobs, scholarships and opportunities delivered to your inbox.</p>
            <form className="opportunities-newsletter" onSubmit={(event) => {
              event.preventDefault()
              setNewsletterMessage('Sign-ups are coming soon. Your email has not been sent or saved.')
            }}>
              <label htmlFor="opportunities-email">Email address</label>
              <input id="opportunities-email" type="email" autoComplete="email" placeholder="you@example.com" aria-describedby="opportunities-newsletter-note" required />
              <button type="submit" className="home-button home-button-primary">Subscribe</button>
              <p id="opportunities-newsletter-note" className="opportunities-note">Preview only. No email is sent or saved.</p>
              <p role="status" className="opportunities-note">{newsletterMessage}</p>
            </form>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Opportunities

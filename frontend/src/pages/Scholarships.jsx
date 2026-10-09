import { detailPath } from '../config/contentCategories.js'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, GraduationCap, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import Pagination from '../components/Pagination.jsx'
import useScholarships from '../hooks/useScholarships.js'
import '../styles/home.css'
import '../styles/scholarships.css'

const PER_PAGE = 9
const emptyFilters = { search: '', country: '', level: '', location: '', eligibility: '' }
const countries = [['NG', 'Nigeria'], ['GH', 'Ghana'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['RW', 'Rwanda'], ['SN', 'Senegal']]

function Scholarships() {
  const [draft, setDraft] = useState(emptyFilters)
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const heading = useRef(null)
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]))
  const { scholarships, pagination, loading, error, retry } = useScholarships({ ...params, page, limit: PER_PAGE })
  const hasFilters = Object.values(filters).some((value) => value.trim())
  function clearFilters() { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1) }
  function changePage(nextPage) {
    setPage(nextPage)
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'start' })
  }
  function updateDraft(key, value) { setDraft((current) => ({ ...current, [key]: value })) }
  return (
    <div className="scholarships-page">
      <section className="scholarships-hero" aria-labelledby="scholarships-title">
        <div className="scholarships-hero-icon"><GraduationCap size={30} aria-hidden="true" /></div>
        <p className="home-eyebrow">Education ? Nigeria & Africa</p>
        <h1 id="scholarships-title">Scholarships for your next chapter</h1>
        <p>Explore funding for your studies. Find scholarships that match your location, education level and ambitions.</p>
      </section>
      <form className="scholarships-controls" role="search" onSubmit={(event) => {
        event.preventDefault(); setFilters({ ...draft }); setPage(1)
      }}>
        <div className="scholarships-controls-heading"><h2><SlidersHorizontal size={18} aria-hidden="true" />Find your fit</h2><button type="button" className="scholarships-clear" onClick={clearFilters}>Clear filters</button></div>
        <label className="scholarships-label" htmlFor="scholarship-search">Search scholarships</label>
        <div className="scholarships-search-row">
          <input id="scholarship-search" type="search" maxLength={200} placeholder="Search titles, organizations or keywords" value={draft.search} onChange={(event) => updateDraft('search', event.target.value)} />
          <button className="home-button home-button-primary" type="submit"><Search size={18} aria-hidden="true" />Search scholarships</button>
        </div>
        <div className="scholarships-filter-grid">
          <div><label className="scholarships-label" htmlFor="scholarship-country">Country</label><select id="scholarship-country" value={draft.country} onChange={(event) => updateDraft('country', event.target.value)}><option value="">All countries</option>{countries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {[
            ['level', 'Education level', 'e.g. Undergraduate or Masters'],
            ['location', 'Location', 'e.g. Lagos or Nairobi'],
            ['eligibility', 'Eligibility', 'e.g. Recent graduates'],
          ].map(([key, label, placeholder]) => <div key={key}><label className="scholarships-label" htmlFor={'scholarship-' + key}>{label}</label><input id={'scholarship-' + key} maxLength={200} value={draft[key]} placeholder={placeholder} onChange={(event) => updateDraft(key, event.target.value)} /></div>)}
        </div>
      </form>
      <section className="scholarships-results" aria-labelledby="scholarship-results-title" aria-busy={loading}>
        <div className="scholarships-results-heading">
          <div><p className="home-eyebrow">Explore your options</p><h2 id="scholarship-results-title" ref={heading} tabIndex={-1}>Latest scholarships</h2></div>
          <p role="status">{loading ? 'Finding scholarships?' : error ? 'Scholarships could not be loaded.' : <>{pagination.total} {pagination.total === 1 ? 'scholarship' : 'scholarships'}{scholarships.length > 0 && <> ? Showing {(page - 1) * PER_PAGE + 1}?{(page - 1) * PER_PAGE + scholarships.length}</>}</>}</p>
        </div>
        {loading && <div className="scholarships-state" role="status"><GraduationCap size={32} aria-hidden="true" /><h3>Finding your next opportunity</h3><p>Loading scholarships. Please wait a moment.</p></div>}
        {error && <div className="scholarships-state" role="alert"><h3>We couldn?t load scholarships</h3><p>{error}</p><button type="button" className="home-button home-button-primary" onClick={retry}>Try again</button></div>}
        {!loading && !error && scholarships.length === 0 && <div className="scholarships-state"><Search size={32} aria-hidden="true" /><h3>{hasFilters ? 'No matching scholarships' : 'No scholarships available yet'}</h3><p>{hasFilters ? 'Try a different keyword or broaden your filters.' : 'Check back soon for new funding opportunities.'}</p>{hasFilters && <button type="button" className="home-button home-button-secondary" onClick={clearFilters}>Clear filters</button>}</div>}
        <div className="scholarships-grid">
          {scholarships.map((scholarship) => (
            <article className="scholarship-card" key={scholarship._id ?? scholarship.id ?? scholarship.slug}>
              <div className="scholarship-card-top"><GraduationCap size={24} aria-hidden="true" /><span className="home-tag">{scholarship.level || 'Scholarship'}</span></div>
              <h3>{scholarship.title}</h3>
              <p className="scholarship-organization">{scholarship.organization}</p>
              <p className="scholarship-location"><MapPin size={15} aria-hidden="true" />{scholarship.location}</p>
              <p className="scholarship-description">{scholarship.description}</p>
              <dl className="scholarship-facts">
                {scholarship.funding && <div><dt>Funding</dt><dd>{scholarship.funding}</dd></div>}
                {scholarship.eligibility && <div><dt>Eligibility</dt><dd>{scholarship.eligibility}</dd></div>}
                <div><dt>Apply by</dt><dd><time dateTime={scholarship.deadline}>{new Date(scholarship.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time></dd></div>
              </dl>
              <div className="scholarship-actions"><Link className="home-button home-button-primary" to={detailPath('scholarships', scholarship.slug)} aria-label={'View scholarship: ' + scholarship.title}>View Scholarship <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
            </article>
          ))}
        </div>
        {!loading && !error && <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={changePage} label="Scholarship result pages" />}
      </section>
    </div>
  )
}
export default Scholarships

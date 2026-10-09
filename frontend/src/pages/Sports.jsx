import { useState } from 'react'
import { Newspaper } from 'lucide-react'
import Pagination from '../components/Pagination.jsx'
import SportsStory from '../components/SportsStory.jsx'
import useSportsArticles from '../hooks/useSportsArticles.js'
import { publicCategory } from '../config/contentCategories.js'
import '../styles/home.css'
import '../styles/sports.css'

export default function Sports({ category = 'sports' }) {
  const label = publicCategory(category).label
  const topic = category === 'sports' ? 'sports' : label.toLowerCase()
  const [page, setPage] = useState(1)
  const { articles, pagination, loading, error, retry } = useSportsArticles({ page, limit: 9 }, category)
  return <div className="sports-page">
    <section className="home-hero" aria-labelledby="sports-title">
      <p className="home-eyebrow"><Newspaper size={20} aria-hidden="true" /> {category === 'sports' ? 'Around the sporting world' : 'Around the world'}</p>
      <h1 id="sports-title">{label}</h1>
      <p className="home-hero-description">Catch up on {topic} headlines, with short summaries and links to the original publishers.</p>
    </section>
    <section className="home-section" aria-labelledby="sports-latest" aria-busy={loading}>
      <div className="home-section-heading"><h2 id="sports-latest">Latest {topic} stories</h2></div>
      {loading && <p role="status">Loading {topic} stories...</p>}
      {error && <div className="sports-state" role="alert"><p>{error}</p><button type="button" className="home-button home-button-primary" onClick={retry}>Try again</button></div>}
      {!loading && !error && articles.length === 0 && <div className="sports-state"><h3>No {topic} stories yet</h3><p>Check back soon for the latest {topic} coverage.</p></div>}
      <div className="home-card-grid sports-grid">{articles.map(article => <SportsStory key={article._id} article={article} category={category} />)}</div>
      {!loading && !error && <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} label={`${label} story pages`} />}
    </section>
  </div>
}

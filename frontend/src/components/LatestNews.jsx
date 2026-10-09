import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { detailPath, listingPath, publicCategory } from '../config/contentCategories.js'
import useLatestNews from '../hooks/useLatestNews.js'

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }) : ''
}

// Renders nothing (no blank box) when there is no permitted image or it fails to load.
function Thumb({ image, className }) {
  const [failed, setFailed] = useState(false)
  if (!image || failed) return null
  return <div className={className}><img src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} /></div>
}

function Lead({ item }) {
  const { category, article, image } = item
  const date = article.sourcePublishedAt ?? article.publishedAt
  const to = detailPath(category, article.slug)
  return <article className="latest-lead">
    <Thumb image={image} className="latest-lead-media" />
    <div className="latest-lead-body">
      <span className="latest-kicker">{publicCategory(category).label}</span>
      <h3><Link to={to}>{article.title}</Link></h3>
      {article.summary && <p className="latest-summary">{article.summary}</p>}
      <div className="latest-meta">{date && <time dateTime={date}>{formatDate(date)}</time>}<Link to={to} className="latest-read">Read story <ArrowRight size={16} aria-hidden="true" /></Link></div>
    </div>
  </article>
}

function Row({ item }) {
  const { category, article, image } = item
  const date = article.sourcePublishedAt ?? article.publishedAt
  return <article className="latest-row">
    <div className="latest-row-body">
      <span className="latest-kicker">{publicCategory(category).label}</span>
      <h4><Link to={detailPath(category, article.slug)}>{article.title}</Link></h4>
      {date && <time dateTime={date}>{formatDate(date)}</time>}
    </div>
    <Thumb image={image} className="latest-row-media" />
  </article>
}

export default function LatestNews() {
  const { items, loading } = useLatestNews(5)
  const [lead, ...rest] = items
  return <section className="home-section latest-news" aria-labelledby="home-latest-title">
    <div className="home-section-heading home-section-heading-row">
      <div><h2 id="home-latest-title">Latest News</h2><p>Fresh published headlines from across Bigi_Hub.</p></div>
      <Link className="home-text-link" to={listingPath('news')}>All news <ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
    {loading && <p role="status">Loading latest news...</p>}
    {!loading && !lead && <p role="status" className="latest-empty">No news has been published yet. Check back soon.</p>}
    {lead && <div className="latest-grid" aria-busy={loading}>
      <Lead item={lead} />
      {rest.length > 0 && <div className="latest-side">{rest.map(item => <Row key={`${item.category}:${item.article.slug}`} item={item} />)}</div>}
    </div>}
  </section>
}

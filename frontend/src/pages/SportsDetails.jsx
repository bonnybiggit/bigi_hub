import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Seo from '../components/Seo.jsx'
import ArticleComments from '../components/ArticleComments.jsx'
import { SportsSource, SportsDate } from '../components/SportsStory.jsx'
import { getPublicDetail } from '../services/publicListings.js'
import { listingPath, publicCategory } from '../config/contentCategories.js'
import '../styles/home.css'
import '../styles/sports.css'

export function SportsArticleContent({ article, category = 'sports' }) {
  return <article className="home-card sports-article">
    <span className="home-tag">{publicCategory(category).label}</span>
    <h1>{article.title}</h1>
    <SportsSource article={article} />
    <p className="sports-date">Original publication: <SportsDate value={article.sourcePublishedAt} /></p>
    {article.summary && <p className="sports-article-summary">{article.summary}</p>}
    <p>Continue reading at the original publisher.</p>
    <a className="home-button home-button-primary" href={article.sourceUrl} target="_blank" rel="noopener noreferrer">Read on {article.sourceName} <ExternalLink size={18} aria-hidden="true" /></a>
    <p className="sports-credit">{category === 'sports' && 'Collected via The News API. '}Original reporting belongs to {article.sourceName}.</p>
  </article>
}

export default function SportsDetails({ category = 'sports' }) {
  const label = publicCategory(category).label
  const { slug } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const key = `${category}:${slug}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    getPublicDetail(category, slug, { signal: controller.signal }).then(article => {
      if (!controller.signal.aborted) setState({ key, article, error: '' })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ key, article: null, error: 'Unable to load this story. Please try again.' })
    })
    return () => controller.abort()
  }, [slug, key, category])
  const loading = state?.key !== key
  const article = loading ? null : state.article
  return <div className="sports-page">
    <Seo title={article ? `${article.title} | Bigi_Hub` : `${label} story | Bigi_Hub`} description={article?.summary || `${label} headlines and original publisher links on Bigi_Hub.`} noindex={!article} />
    <Link className="home-text-link sports-back" to={listingPath(category)}><ArrowLeft size={18} aria-hidden="true" />Back to {label}</Link>
    {loading ? <p role="status">Loading {label.toLowerCase()} story...</p> : state.error ? <div className="sports-state" role="alert"><p>{state.error}</p><button className="home-button home-button-primary" type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : article ? <><SportsArticleContent article={article} category={category} />{<ArticleComments key={`${category}:${slug}`} category={category} slug={slug} />}</> : <div className="sports-state"><h1>{label} story not found</h1><p>This story is unavailable. Explore other {label.toLowerCase()} headlines.</p></div>}
  </div>
}

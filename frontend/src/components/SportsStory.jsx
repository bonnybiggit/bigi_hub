import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { detailPath, publicCategory } from '../config/contentCategories.js'

export function SportsSource({ article }) {
  return <p className="sports-source">Source: <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">{article.sourceName} <ExternalLink size={14} aria-hidden="true" /></a></p>
}

export function SportsDate({ value }) {
  return <time dateTime={value}>{new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })}</time>
}

export default function SportsStory({ article, category = 'sports' }) {
  return <article className="home-card sports-card">
    <span className="home-tag">{publicCategory(category).label}</span>
    <h3><Link to={detailPath(category, article.slug)}>{article.title}</Link></h3>
    <SportsSource article={article} />
    <p className="sports-date"><SportsDate value={article.sourcePublishedAt} /></p>
    {article.summary && <p className="sports-summary">{article.summary}</p>}
    <Link className="home-text-link home-card-link" to={detailPath(category, article.slug)}>Read story <ArrowRight size={18} aria-hidden="true" /></Link>
  </article>
}

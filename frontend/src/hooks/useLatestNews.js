import { useEffect, useState } from 'react'
import useListingRefresh from './useListingRefresh.js'
import { getPublicListings } from '../services/publicListings.js'

const NEWS_CATEGORIES = Object.freeze(['news', 'business', 'technology', 'health', 'sports'])

// Images are shown only when the published record carries a secure image URL.
export function safeImageUrl(value) {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'https:' ? url.href : ''
  } catch { return '' }
}

const time = article => Date.parse(article.sourcePublishedAt ?? article.publishedAt ?? article.createdAt ?? '') || 0

export function mergeLatestNews(results, limit = 5) {
  return results
    .flatMap(({ category, articles }) => articles.filter(article => article?.slug && article?.title).map(article => ({
      category, article, image: safeImageUrl(article.imageUrl ?? article.urlToImage ?? article.image),
    })))
    .sort((a, b) => time(b.article) - time(a.article))
    .slice(0, limit)
}

export default function useLatestNews(limit = 5) {
  const [state, setState] = useState({ items: [], loading: true })
  const [attempt] = useListingRefresh()
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(NEWS_CATEGORIES.map(category =>
      getPublicListings(category, { page: 1, limit }, { signal: controller.signal })
        .then(result => ({ category, articles: result.data }))
        .catch(() => ({ category, articles: [] }))
    )).then(results => { if (!controller.signal.aborted) setState({ items: mergeLatestNews(results, limit), loading: false }) })
    return () => controller.abort()
  }, [attempt, limit])
  return state
}

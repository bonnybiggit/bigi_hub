import { useEffect, useState } from 'react'
import useListingRefresh from './useListingRefresh.js'
import { getPublicListings } from '../services/publicListings.js'
import { detailPath, listingPath, publicCategory } from '../config/contentCategories.js'

export const TICKER_CATEGORIES = Object.freeze(['news', 'technology', 'sports'])
const MAX_HEADLINE = 70

export function shortHeadline(title) {
  const text = String(title ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= MAX_HEADLINE) return text
  return `${text.slice(0, MAX_HEADLINE - 1).replace(/\s+\S*$/, '').trimEnd() || text.slice(0, MAX_HEADLINE - 1)}…`
}

// Empty categories are omitted; articles without a slug fall back to the category page.
export function buildTickerItems(results) {
  return results.flatMap(({ category, article }) => {
    const headline = shortHeadline(article?.title)
    if (!headline) return []
    return [{
      id: `${category}:${article.slug ?? headline}`,
      label: publicCategory(category).label,
      headline,
      to: article.slug ? detailPath(category, article.slug) : listingPath(category),
    }]
  })
}

export default function useLatestTicker() {
  const [items, setItems] = useState([])
  const [attempt] = useListingRefresh()
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(TICKER_CATEGORIES.map(category =>
      getPublicListings(category, { page: 1, limit: 1 }, { signal: controller.signal })
        .then(result => ({ category, article: result.data[0] }))
        .catch(() => ({ category, article: null }))
    )).then(results => { if (!controller.signal.aborted) setItems(buildTickerItems(results)) })
    return () => controller.abort()
  }, [attempt])
  return items
}

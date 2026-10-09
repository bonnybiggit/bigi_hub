import { useEffect, useState } from 'react'
import useListingRefresh from './useListingRefresh.js'
import { getPublicListings } from '../services/publicListings.js'

export default function useSportsArticles(params, category = 'sports') {
  const [state, setState] = useState(null)
  const [attempt, refresh] = useListingRefresh()
  const key = JSON.stringify([params, attempt, category])
  useEffect(() => {
    const controller = new AbortController()
    getPublicListings(JSON.parse(key)[2], JSON.parse(key)[0], { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setState({ key, articles: result.data, pagination: result.pagination, error: '' })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ key, articles: [], pagination: null, error: 'Unable to load stories. Please try again.' })
    })
    return () => controller.abort()
  }, [key])
  return state?.key === key ? { ...state, loading: false, retry: refresh } : { articles: [], pagination: null, error: '', loading: true, retry: refresh }
}

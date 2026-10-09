import { useCallback, useEffect, useState } from 'react'
import { subscribeListingRefresh } from '../utils/listingRefresh.js'

export default function useListingRefresh() {
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(current => current + 1), [])
  useEffect(() => subscribeListingRefresh(refresh), [refresh])
  return [version, refresh]
}

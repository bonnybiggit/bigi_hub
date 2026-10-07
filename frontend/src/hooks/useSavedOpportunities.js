import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bigi_hub.savedOpportunityIds'

function readSavedIds() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved)
      ? [...new Set(saved.filter((id) => typeof id === 'string' && id.length > 0))]
      : []
  } catch {
    return []
  }
}

export default function useSavedOpportunities() {
  const [savedOpportunityIds, setSavedOpportunityIds] = useState(readSavedIds)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedOpportunityIds))
    } catch {
      // Bookmarks still work for this session when browser storage is unavailable.
    }
  }, [savedOpportunityIds])

  function toggleSavedOpportunity(id) {
    setSavedOpportunityIds((current) => current.includes(id)
      ? current.filter((savedId) => savedId !== id)
      : [...current, id])
  }

  return { savedOpportunityIds, toggleSavedOpportunity }
}

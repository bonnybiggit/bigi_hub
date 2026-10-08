import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bigi_hub.savedOpportunityIds'

function readSavedIds(storageKey) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey))
    return Array.isArray(saved)
      ? [...new Set(saved.filter((id) => typeof id === 'string' && id.length > 0))]
      : []
  } catch {
    return []
  }
}

export default function useSavedOpportunities(storageKey = STORAGE_KEY) {
  const [savedOpportunityIds, setSavedOpportunityIds] = useState(() => readSavedIds(storageKey))

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(savedOpportunityIds))
    } catch {
      // Bookmarks still work for this session when browser storage is unavailable.
    }
  }, [savedOpportunityIds, storageKey])

  function toggleSavedOpportunity(id) {
    setSavedOpportunityIds((current) => current.includes(id)
      ? current.filter((savedId) => savedId !== id)
      : [...current, id])
  }

  return { savedOpportunityIds, toggleSavedOpportunity }
}

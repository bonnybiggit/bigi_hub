import useListingRefresh from './useListingRefresh.js'
import { useEffect, useState } from 'react'
import { getOpportunities } from '../services/opportunities.service.js'

function normalizeOpportunity(opportunity) {
  return {
    ...opportunity,
    id: opportunity._id ?? opportunity.id,
    region: opportunity.region ?? 'Africa',
    listedDate: opportunity.listedDate ?? opportunity.createdAt ?? '',
    deadlineLabel: opportunity.deadlineLabel ?? new Date(opportunity.deadline).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }),
  }
}

export default function useOpportunities() {
  const [state, setState] = useState({ opportunities: [], loading: true, error: '' })
  const [attempt, refresh] = useListingRefresh()

  useEffect(() => {
    let active = true
    async function loadOpportunities() {
      try {
        const opportunities = []
        let page = 1
        let totalPages = 1
        do {
          const response = await getOpportunities({ page, limit: 100 })
          if (response.status !== 'ok' || !Array.isArray(response.data)) {
            throw new Error('Invalid opportunities response')
          }
          if (!active) return
          opportunities.push(...response.data.map(normalizeOpportunity))
          totalPages = response.pagination?.totalPages ?? 1
          page += 1
        } while (page <= totalPages)
        setState({ opportunities, loading: false, error: '' })
      } catch {
        if (active) setState({ opportunities: [], loading: false, error: 'Unable to load opportunities. Please try again.' })
      }
    }
    loadOpportunities()
    return () => { active = false }
  }, [attempt])

  function retry() {
    setState({ opportunities: [], loading: true, error: '' })
    refresh()
  }

  return { ...state, retry }
}

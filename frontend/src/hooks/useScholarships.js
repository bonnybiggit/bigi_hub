import { useEffect, useState } from 'react'
import { getScholarships } from '../services/scholarships.service.js'

export default function useScholarships(params = {}) {
  const [state, setState] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = JSON.stringify([params, attempt])
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await getScholarships(JSON.parse(requestKey)[0])
        const pagination = response.pagination
        if (response.status !== 'ok' || !Array.isArray(response.data) || !pagination ||
          !Number.isInteger(pagination.total) || pagination.total < 0 ||
          !Number.isInteger(pagination.totalPages) || pagination.totalPages < 0) throw new Error('Invalid scholarships response')
        if (active) setState({ requestKey, scholarships: response.data, pagination, error: '' })
      } catch {
        if (active) setState({ requestKey, scholarships: [], pagination: null, error: 'Unable to load scholarships. Please try again.' })
      }
    }
    load()
    return () => { active = false }
  }, [requestKey])
  const loading = state?.requestKey !== requestKey
  return {
    scholarships: loading ? [] : state.scholarships,
    pagination: loading ? null : state.pagination,
    error: loading ? '' : state.error,
    loading,
    retry: () => setAttempt((current) => current + 1),
  }
}

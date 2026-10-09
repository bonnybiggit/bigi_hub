import useListingRefresh from './useListingRefresh.js'
import { useEffect, useState } from 'react'
import { getJobs } from '../services/jobs.service.js'

function normalizeJob(job) {
  return {
    ...job,
    id: job._id ?? job.id,
    region: job.region ?? 'Africa',
    salaryRange: job.salaryRange ?? job.compensation,
    requirements: job.requirements ?? [],
    benefits: job.benefits ?? [],
    listedDate: job.listedDate ?? job.createdAt ?? '',
    deadlineLabel: job.deadlineLabel ?? new Date(job.deadline).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }),
  }
}

export default function useJobs() {
  const [state, setState] = useState({ jobs: [], loading: true, error: '' })
  const [attempt, refresh] = useListingRefresh()

  useEffect(() => {
    let active = true
    async function loadJobs() {
      try {
        const jobs = []
        let page = 1
        let totalPages = 1
        do {
          const response = await getJobs({ page, limit: 100 })
          if (response.status !== 'ok' || !Array.isArray(response.data)) {
            throw new Error('Invalid jobs response')
          }
          if (!active) return
          jobs.push(...response.data.map(normalizeJob))
          totalPages = response.pagination?.totalPages ?? 1
          page += 1
        } while (page <= totalPages)
        setState({ jobs, loading: false, error: '' })
      } catch {
        if (active) setState({ jobs: [], loading: false, error: 'Unable to load jobs. Please try again.' })
      }
    }
    loadJobs()
    return () => { active = false }
  }, [attempt])

  function retry() {
    setState({ jobs: [], loading: true, error: '' })
    refresh()
  }

  return { ...state, retry }
}

import { detailPath } from '../config/contentCategories.js'

export function listingHighlights(jobs, opportunities, scholarships) {
  return [
    ...jobs.map(item => ({ ...item, section: 'jobs', category: item.jobType || 'Jobs', cta: 'View Job' })),
    ...opportunities.map(item => ({ ...item, section: 'opportunities', cta: 'View Opportunity' })),
    ...scholarships.map(item => ({ ...item, section: 'scholarships', category: 'Scholarships', cta: 'View Scholarship' })),
  ].sort((a, b) => (b.listedDate || b.createdAt || '').localeCompare(a.listedDate || a.createdAt || ''))
    .slice(0, 3).map(item => ({ ...item, id: item._id ?? item.id,
      to: detailPath(item.section, item.slug),
      deadlineLabel: item.deadlineLabel || new Date(item.deadline).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
      }),
    }))
}

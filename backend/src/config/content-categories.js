// Public, dependency-free metadata shared by the API and both Vite applications.
// AI classifications deliberately remain separate from publishing destinations.
const commonFields = ['title', 'slug', 'organization', 'description', 'location', 'countryCode', 'deadline', 'applyUrl', 'listedDate']
const destination = (id, label, singular, model, fields, filters, description) => ({
  id, label, singular, slug: id, destination: id, apiPath: `/${id}`, model,
  navigationVisible: true, publishable: true, homepageVisible: true, description,
  fields: [...commonFields, ...fields], filters,
})
export const PUBLIC_CATEGORIES = Object.freeze([
  destination('jobs', 'Jobs', 'Job', 'Job', ['jobType', 'workType', 'experienceLevel', 'compensation', 'requirements', 'benefits', 'archivedAt'], ['location', 'jobType', 'workType', 'experience'], 'Take your next career step.'),
  destination('opportunities', 'Opportunities', 'Opportunity', 'Opportunity', ['category', 'eligibility', 'funding', 'benefit'], ['category', 'location', 'eligibility', 'countryCode'], 'Explore programmes, funding and learning.'),
  destination('scholarships', 'Scholarships', 'Scholarship', 'Scholarship', ['level', 'eligibility', 'funding'], ['country', 'eligibility', 'location', 'level'], 'Find support for your studies.'),
].map(item => Object.freeze({ ...item, fields: Object.freeze(item.fields), filters: Object.freeze(item.filters) })))

// Existing Opportunity enum values: IDs/slugs are metadata, not new public routes.
export const OPPORTUNITY_TYPES = Object.freeze([
  ['scholarship', 'Scholarships'], ['grants', 'Grants'], ['fellowships', 'Fellowships'],
  ['internships', 'Internships'], ['graduate-programs', 'Graduate Programs'],
  ['training', 'Training'], ['competitions', 'Competitions'], ['volunteering', 'Volunteering'],
].map(([id, label]) => Object.freeze({ id, label, slug: id, destination: 'opportunities',
  apiPath: '/opportunities', model: 'Opportunity', categoryValue: label,
  navigationVisible: false, publishable: false, fields: PUBLIC_CATEGORIES[1].fields })))
export const CATEGORY_REGISTRY = Object.freeze([...PUBLIC_CATEGORIES, ...OPPORTUNITY_TYPES])
export const PUBLIC_DESTINATIONS = Object.freeze(PUBLIC_CATEGORIES.map(item => item.id))
export const OPPORTUNITY_CATEGORIES = Object.freeze(OPPORTUNITY_TYPES.map(item => item.categoryValue))
export const NAVIGATION_CATEGORIES = Object.freeze(PUBLIC_CATEGORIES.filter(item => item.navigationVisible))

export function publicCategory(id) {
  const category = PUBLIC_CATEGORIES.find(item => item.id === id)
  if (!category) throw new Error('Unsupported public destination.')
  return category
}
export const listingPath = id => `/${publicCategory(id).slug}`
export const detailPath = (id, slug) => `${listingPath(id)}/${encodeURIComponent(slug)}`

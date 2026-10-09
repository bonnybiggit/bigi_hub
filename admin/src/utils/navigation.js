import { NAVIGATION_CATEGORIES } from '../../../backend/src/config/content-categories.js'
export const adminSections = [...NAVIGATION_CATEGORIES.filter(item => !['SportsArticle', 'NewsArticle'].includes(item.model)).map(item => item.label), 'Articles', 'Users', 'Settings']
export const adminNavigation = [{ to: '/', label: 'Dashboard' }, { to: '/ai-post-assistant', label: 'AI Post Assistant' },
  { to: '/comments', label: 'Comments & Moderation' },
  ...NAVIGATION_CATEGORIES.map(item => ({ to: '/' + item.slug, label: item.label })),
  ...['Articles', 'Users', 'Settings'].map(label => ({ to: '/' + label.toLowerCase(), label })),
]

const byLabel = new Map(adminNavigation.map(item => [item.label, item]))
const pick = labels => labels.map(label => byLabel.get(label)).filter(Boolean)
const newsLabels = NAVIGATION_CATEGORIES.filter(item => ['SportsArticle', 'NewsArticle'].includes(item.model)).map(item => item.label)
const listingLabels = NAVIGATION_CATEGORIES.filter(item => !['SportsArticle', 'NewsArticle'].includes(item.model)).map(item => item.label)

// Presentation-only grouping of the same links; routes are unchanged.
export const adminNavigationGroups = [
  { label: 'Overview', links: pick(['Dashboard']) },
  { label: 'Listings', links: pick(listingLabels) },
  { label: 'News & Content', links: pick([...newsLabels, 'Articles']) },
  { label: 'Review & Moderation', links: pick(['AI Post Assistant', 'Comments & Moderation']) },
  { label: 'Administration', links: pick(['Users', 'Settings']) },
]


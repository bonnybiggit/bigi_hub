import { NAVIGATION_CATEGORIES } from '../../../backend/src/config/content-categories.js'
export const adminSections = [...NAVIGATION_CATEGORIES.map(item => item.label), 'Articles', 'Users', 'Settings']
export const adminNavigation = [{ to: '/', label: 'Dashboard' }, { to: '/ai-post-assistant', label: 'AI Post Assistant' },
  ...NAVIGATION_CATEGORIES.map(item => ({ to: '/' + item.slug, label: item.label })),
  ...['Articles', 'Users', 'Settings'].map(label => ({ to: '/' + label.toLowerCase(), label })),
]

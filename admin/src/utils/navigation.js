export const adminSections = ['Jobs', 'Opportunities', 'Scholarships', 'Articles', 'Users', 'Settings']
export const adminNavigation = [{ to: '/', label: 'Dashboard' }, { to: '/ai-post-assistant', label: 'AI Post Assistant' }, ...adminSections.map(label => ({ to: '/' + label.toLowerCase(), label }))]

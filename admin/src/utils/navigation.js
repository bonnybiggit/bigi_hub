export const adminSections = ['Jobs', 'Opportunities', 'Scholarships', 'Articles', 'Users', 'Settings']
export const adminNavigation = [{ to: '/', label: 'Dashboard' }, ...adminSections.map(label => ({ to: '/' + label.toLowerCase(), label }))]

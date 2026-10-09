import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { adminNavigationGroups } from '../utils/navigation.js'

const comingSoon = new Set(['Articles', 'Users', 'Settings'])
const descriptions = {
  'AI Post Assistant': 'Create, review and approve AI-assisted posts before publishing.',
  'Comments & Moderation': 'Hide, restore or delete reader comments across all article categories.',
  Articles: 'General article management.',
  Users: 'Administrator and user management.',
  Settings: 'Site and account settings.',
}
const describe = label => descriptions[label] ?? `Manage and review ${label.toLowerCase()} content.`
const slug = label => label.replace(/\W+/g, '-').toLowerCase()
const workspaceGroups = adminNavigationGroups.filter(group => group.label !== 'Overview' && group.links.length)

export default function Dashboard() {
  usePageTitle('Dashboard')
  return <><PageHeader title="Admin dashboard" description="Manage listings, news and moderation from one workspace." />
    <section className="dashboard-statistics" aria-labelledby="statistics-heading"><div className="section-heading"><h2 id="statistics-heading">At a glance</h2></div>
      <div className="panel statistics-empty"><div><h3>Live statistics are not available yet</h3><p>Counts for listings, articles and users will appear here once reporting is connected. Nothing on this page is estimated or sample data.</p></div><span className="status-badge is-soon">Coming soon</span></div>
    </section>
    {workspaceGroups.map(group => <section className="workspace-group" key={group.label} aria-labelledby={'dash-' + slug(group.label)}>
      <div className="section-heading"><h2 id={'dash-' + slug(group.label)}>{group.label}</h2></div>
      <div className="overview-grid">{group.links.map(({ to, label }) => <Link className="panel section-link" to={to} key={to}>
        <span className="section-link-head"><h3>{label}</h3>{comingSoon.has(label) && <span className="status-badge is-soon">Coming soon</span>}</span>
        <p>{describe(label)}</p><span className="workspace-cta">Open workspace <span aria-hidden="true">&rarr;</span></span></Link>)}</div>
    </section>)}
  </>
}

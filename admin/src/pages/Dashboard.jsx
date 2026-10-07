import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { adminSections } from '../utils/navigation.js'
export default function Dashboard() {
  usePageTitle('Dashboard')
  return <><PageHeader title="Admin dashboard" description="Welcome to the Bigi_Hub administration workspace." />
    <section className="dashboard-statistics" aria-labelledby="statistics-heading"><div className="section-heading"><h2 id="statistics-heading">At a glance</h2><span className="placeholder-label">Placeholder statistics</span></div>
      <dl className="statistics-grid">{['Jobs', 'Opportunities', 'Scholarships', 'Articles', 'Users'].map(label => <div className="panel statistic" key={label}><dt>{label}</dt><dd><span aria-hidden="true">&mdash;</span><span className="visually-hidden">Not connected</span></dd><p>Statistics not connected</p></div>)}</dl>
    </section>
    <section aria-labelledby="workspaces-heading"><div className="section-heading"><h2 id="workspaces-heading">Workspaces</h2></div><div className="overview-grid">{adminSections.map(title => <Link className="panel section-link" to={'/' + title.toLowerCase()} key={title}><h2>{title}</h2><p>Open the prepared {title.toLowerCase()} workspace.</p><span className="workspace-cta">View workspace <span aria-hidden="true">&rarr;</span></span></Link>)}</div></section>
    <p className="foundation-note">Workspaces are placeholders. Content management and account settings are not connected yet.</p>
  </>
}

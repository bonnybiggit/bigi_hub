import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
export default function Profile() {
  usePageTitle('Admin profile')
  const { admin } = useAuth()
  return <><PageHeader title="Admin profile" description="Your currently signed-in admin account." /><section className="panel profile-panel" aria-labelledby="account-heading"><h2 id="account-heading">Account details</h2><dl className="profile-details"><div><dt>Email</dt><dd>{admin.email}</dd></div><div><dt>Access</dt><dd>Administrator</dd></div></dl><p>Profile editing is not available yet.</p></section></>
}

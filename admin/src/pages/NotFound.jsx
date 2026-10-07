import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
export default function NotFound() {
  usePageTitle('Page not found')
  return <><PageHeader title="Page not found" description="This admin page does not exist." /><Link to="/">Return to overview</Link></>
}

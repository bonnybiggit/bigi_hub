import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
export default function Listings({ title }) {
  usePageTitle(title)
  return <><PageHeader title={title} description={'The ' + title.toLowerCase() + ' admin workspace.'} /><EmptyState title="Workspace prepared">Content management will be connected in a later step.</EmptyState></>
}

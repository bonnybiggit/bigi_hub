import { PUBLIC_CATEGORIES, listingPath } from './config/contentCategories.js'
import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import Home from './pages/Home.jsx'
import Opportunities from './pages/Opportunities.jsx'
import OpportunityDetails from './pages/OpportunityDetails.jsx'
import Jobs from './pages/Jobs.jsx'
import JobDetails from './pages/JobDetails.jsx'
import Scholarships from './pages/Scholarships.jsx'
import ScholarshipDetails from './pages/ScholarshipDetails.jsx'
import NotFound from './pages/NotFound.jsx'
import Search from './pages/Search.jsx'
import { RouteSeo } from './components/Seo.jsx'
import useSavedOpportunities from './hooks/useSavedOpportunities.js'

function App() {
  const { savedOpportunityIds, toggleSavedOpportunity } = useSavedOpportunities()
  const { savedOpportunityIds: savedScholarshipIds, toggleSavedOpportunity: toggleSavedScholarship } = useSavedOpportunities('bigi_hub.savedScholarshipIds')
  const [savedJobIds, setSavedJobIds] = useState([])

  function toggleSavedJob(id) {
    setSavedJobIds((current) => current.includes(id)
      ? current.filter((savedId) => savedId !== id)
      : [...current, id])
  }

  return (
    <MainLayout>
      <RouteSeo />
      <Routes>
        <Route path="/" element={<Home />} />
        {PUBLIC_CATEGORIES.map(category => {
          const pages = {
            jobs: [<Jobs savedJobIds={savedJobIds} onSaveJob={toggleSavedJob} />, <JobDetails savedJobIds={savedJobIds} onSaveJob={toggleSavedJob} />],
            opportunities: [<Opportunities savedOpportunityIds={savedOpportunityIds} onSaveOpportunity={toggleSavedOpportunity} />, <OpportunityDetails savedOpportunityIds={savedOpportunityIds} onSaveOpportunity={toggleSavedOpportunity} />],
            scholarships: [<Scholarships />, <ScholarshipDetails savedScholarshipIds={savedScholarshipIds} onSaveScholarship={toggleSavedScholarship} />],
          }[category.id]
          if (!pages) throw new Error(`Missing public pages for ${category.id}`)
          return [<Route key={category.id} path={listingPath(category.id)} element={pages[0]} />, <Route key={`${category.id}-detail`} path={`${listingPath(category.id)}/:slug`} element={pages[1]} />]
        })}
        <Route path="/search" element={<Search />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  )
}

export default App

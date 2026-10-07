import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import Home from './pages/Home.jsx'
import Opportunities from './pages/Opportunities.jsx'
import Jobs from './pages/Jobs.jsx'
import JobDetails from './pages/JobDetails.jsx'
import Scholarships from './pages/Scholarships.jsx'
import NotFound from './pages/NotFound.jsx'
import useSavedOpportunities from './hooks/useSavedOpportunities.js'

function App() {
  const { savedOpportunityIds, toggleSavedOpportunity } = useSavedOpportunities()
  const [savedJobIds, setSavedJobIds] = useState([])

  function toggleSavedJob(id) {
    setSavedJobIds((current) => current.includes(id)
      ? current.filter((savedId) => savedId !== id)
      : [...current, id])
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/opportunities" element={<Opportunities savedOpportunityIds={savedOpportunityIds} onSaveOpportunity={toggleSavedOpportunity} />} />
        <Route path="/jobs" element={<Jobs savedJobIds={savedJobIds} onSaveJob={toggleSavedJob} />} />
        <Route path="/jobs/:slug" element={<JobDetails savedJobIds={savedJobIds} onSaveJob={toggleSavedJob} />} />
        <Route path="/scholarships" element={<Scholarships />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  )
}

export default App

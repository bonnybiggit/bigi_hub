import { PUBLIC_CATEGORIES, listingPath } from '../config/contentCategories.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BriefcaseBusiness, GraduationCap, Mail, Users,
} from 'lucide-react'
import CategoryCard from '../components/CategoryCard.jsx'
import OpportunityCard from '../components/OpportunityCard.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import useJobs from '../hooks/useJobs.js'
import useOpportunities from '../hooks/useOpportunities.js'
import useScholarships from '../hooks/useScholarships.js'
import { listingHighlights } from '../utils/listingHighlights.js'
import '../styles/home.css'
import '../styles/public.css'

const categoryIcons = { jobs: BriefcaseBusiness, opportunities: Users, scholarships: GraduationCap }
const categories = PUBLIC_CATEGORIES.filter(item => item.homepageVisible).map(item => ({
  name: item.label, description: item.description, icon: categoryIcons[item.id], to: listingPath(item.id),
}))

const articles = [
  { id: 'application-checklist', title: 'Your next application starts with a clear plan', category: 'Career guide', excerpt: 'A simple checklist for organising your documents, tracking deadlines and preparing your next application.', date: '2026-09-08', dateLabel: '8 September 2026' },
  { id: 'scholarship-preparation', title: 'Getting ready for scholarship applications', category: 'Education', excerpt: 'Make room for research, personal statements and references before application season gets busy.', date: '2026-09-07', dateLabel: '7 September 2026' },
  { id: 'skills-development', title: 'Small steps towards stronger professional skills', category: 'Personal development', excerpt: 'Explore ways to turn everyday learning, practical projects and new connections into steady progress.', date: '2026-09-06', dateLabel: '6 September 2026' },
]

function Home() {
  const jobs = useJobs()
  const opportunities = useOpportunities()
  const scholarships = useScholarships({ limit: 3 })
  const loading = jobs.loading || opportunities.loading || scholarships.loading
  const error = jobs.error || opportunities.error || scholarships.error
  const highlights = listingHighlights(jobs.jobs, opportunities.opportunities, scholarships.scholarships)
  const [newsletterMessage, setNewsletterMessage] = useState('')

  function handleSubscribe(event) {
    event.preventDefault()
    setNewsletterMessage('Subscriptions are coming soon. Your email has not been sent or saved.')
  }

  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <p className="home-eyebrow">Discover. Learn. Move forward.</p>
        <h1 id="home-hero-title">Your next opportunity starts here.</h1>
        <p className="home-hero-description">
          Bigi_Hub brings news, jobs, scholarships, grants, fellowships, internships,
          training and other opportunities together for people in Nigeria, across Africa and beyond.
        </p>
        <div className="home-actions">
          <Link className="home-button home-button-primary" to="/opportunities">
            Explore Opportunities <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link className="home-button home-button-secondary" to="/jobs">Find Jobs</Link>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-categories-title">
        <div className="home-section-heading">
          <h2 id="home-categories-title">Featured Categories</h2>
          <p>Choose where you want to go next.</p>
        </div>
        <ul className="home-category-grid">
          {categories.map((category) => (
            <li key={category.name}>
              <CategoryCard {...category} />
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="home-opportunities-title">
        <div className="home-section-heading home-section-heading-row">
          <div>
            <h2 id="home-opportunities-title">Opportunity Highlights</h2>
            <p>Latest published jobs, opportunities and scholarships.</p>
          </div>
          <Link className="home-text-link" to="/opportunities">Explore opportunities <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        {loading && <p role="status">Loading latest listings...</p>}
        {error && <div role="alert"><p>Some listings could not be loaded. Please try again.</p><button className="home-button home-button-secondary" type="button" onClick={() => { jobs.retry(); opportunities.retry(); scholarships.retry() }}>Try again</button></div>}
        {!loading && !error && highlights.length === 0 && <p role="status">No listings available yet. Check back soon.</p>}
        <div className="home-card-grid" aria-busy={loading}>
          {highlights.map((opportunity) => (
            <OpportunityCard key={`${opportunity.section}-${opportunity.id}`} {...opportunity} />
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-articles-title">
        <div className="home-section-heading">
          <h2 id="home-articles-title">Career & Study Guides</h2>
          <p>A preview of the practical guides and useful updates to come. Sample content only.</p>
        </div>
        <div className="home-card-grid">
          {articles.map((article) => (
            <ArticleCard key={article.id} {...article} />
          ))}
        </div>
      </section>

      <section className="home-newsletter" aria-labelledby="home-newsletter-title">
        <div>
          <Mail className="home-newsletter-icon" size={28} aria-hidden="true" />
          <h2 id="home-newsletter-title">Make room for your next opportunity.</h2>
          <p>Receive new opportunities, practical guides and useful updates in your inbox.</p>
        </div>
        <form className="home-newsletter-form" onSubmit={handleSubscribe}>
          <label htmlFor="newsletter-email">Email address</label>
          <div className="home-newsletter-fields">
            <input id="newsletter-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" aria-describedby="newsletter-note" required />
            <button className="home-button home-button-primary" type="submit">Subscribe</button>
          </div>
          <p id="newsletter-note" className="home-form-note">Preview only. Sign-ups are not yet available; your email will not be sent or saved.</p>
          <p className="home-form-status" role="status">{newsletterMessage}</p>
        </form>
      </section>

      <section className="home-final-cta" aria-labelledby="home-final-title">
        <p className="home-eyebrow">Take the next step</p>
        <h2 id="home-final-title">There is more to discover.</h2>
        <p>Explore the platform and find a direction that fits your ambitions.</p>
        <Link className="home-button home-button-primary" to="/opportunities">
          Explore Bigi_Hub <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}

export default Home

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BriefcaseBusiness, CalendarDays, GraduationCap, HandCoins,
  Mail, Sprout, Trophy, Users, Wrench,
} from 'lucide-react'
import CategoryCard from '../components/CategoryCard.jsx'
import OpportunityCard from '../components/OpportunityCard.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import '../styles/home.css'

const categories = [
  { name: 'Jobs', description: 'Take your next career step.', icon: BriefcaseBusiness, to: '/jobs' },
  { name: 'Scholarships', description: 'Find support for your studies.', icon: GraduationCap, to: '/scholarships' },
  { name: 'Grants', description: 'Bring your ideas to life.', icon: HandCoins, to: '/opportunities' },
  { name: 'Fellowships', description: 'Learn alongside inspiring people.', icon: Users, to: '/opportunities' },
  { name: 'Internships', description: 'Build experience that matters.', icon: Sprout, to: '/opportunities' },
  { name: 'Training', description: 'Develop practical new skills.', icon: Wrench, to: '/opportunities' },
  { name: 'Competitions', description: 'Put your talent to the test.', icon: Trophy, to: '/opportunities' },
  { name: 'Events', description: 'Connect, learn and exchange ideas.', icon: CalendarDays, to: '/opportunities' },
]

// Sample content for the homepage preview; these are not live listings.
const opportunities = [
  { id: 'graduate-trainee', title: 'Graduate Trainee Programme', category: 'Jobs', organization: 'Sample Careers Network', deadline: '2026-10-30', deadlineLabel: '30 October 2026', to: '/jobs', cta: 'Explore jobs' },
  { id: 'postgraduate-scholarship', title: 'Postgraduate Study Scholarship', category: 'Scholarships', organization: 'Example Education Foundation', deadline: '2026-11-15', deadlineLabel: '15 November 2026', to: '/scholarships', cta: 'Explore scholarships' },
  { id: 'community-grant', title: 'Community Innovation Grant', category: 'Grants', organization: 'Sample Community Fund', deadline: '2026-11-20', deadlineLabel: '20 November 2026', to: '/opportunities', cta: 'Explore opportunities' },
]

const articles = [
  { id: 'application-checklist', title: 'Your next application starts with a clear plan', category: 'Career guide', excerpt: 'A simple checklist for organising your documents, tracking deadlines and preparing your next application.', date: '2026-09-08', dateLabel: '8 September 2026' },
  { id: 'scholarship-preparation', title: 'Getting ready for scholarship applications', category: 'Education', excerpt: 'Make room for research, personal statements and references before application season gets busy.', date: '2026-09-07', dateLabel: '7 September 2026' },
  { id: 'skills-development', title: 'Small steps towards stronger professional skills', category: 'Personal development', excerpt: 'Explore ways to turn everyday learning, practical projects and new connections into steady progress.', date: '2026-09-06', dateLabel: '6 September 2026' },
]

function Home() {
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
            <h2 id="home-opportunities-title">Latest Opportunities</h2>
            <p>Sample listings for this preview. These are not open applications.</p>
          </div>
          <Link className="home-text-link" to="/opportunities">Explore opportunities <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="home-card-grid">
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} {...opportunity} />
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-articles-title">
        <div className="home-section-heading">
          <h2 id="home-articles-title">Latest Articles</h2>
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

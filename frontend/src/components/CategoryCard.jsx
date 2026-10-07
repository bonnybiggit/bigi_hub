import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function CategoryCard({ name, description, icon: Icon, to }) {
  return (
    <Link className="home-category-card" to={to}>
      <Icon className="home-category-icon" size={24} aria-hidden="true" />
      <h3>{name}</h3>
      <p>{description}</p>
      <ArrowRight className="home-category-arrow" size={18} aria-hidden="true" />
    </Link>
  )
}

export default CategoryCard

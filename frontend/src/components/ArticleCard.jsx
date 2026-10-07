function ArticleCard({ title, category, excerpt, date, dateLabel }) {
  return (
    <article className="home-card">
      <span className="home-tag">{category}</span>
      <h3>{title}</h3>
      <p className="home-card-excerpt">{excerpt}</p>
      <p className="home-article-date">Published <time dateTime={date}>{dateLabel}</time></p>
    </article>
  )
}

export default ArticleCard

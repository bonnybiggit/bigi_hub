export default function EmptyState({ title, children }) {
  return <section className="panel empty-state"><h2>{title}</h2><p>{children}</p></section>
}

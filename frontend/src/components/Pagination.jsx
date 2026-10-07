import { ChevronLeft, ChevronRight } from 'lucide-react'

function Pagination({ currentPage, totalPages, onPageChange, label = 'Pagination' }) {
  if (totalPages <= 1) return null

  const items = []

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page++) items.push(page)
  } else if (currentPage <= 5) {
    items.push(1, 2, 3, 4, 5, 'gap', totalPages)
  } else if (currentPage >= totalPages - 4) {
    items.push(1, 'gap', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  } else {
    items.push(1, 'gap', currentPage - 1, currentPage, currentPage + 1, 'gap', totalPages)
  }

  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" className="pagination-direction" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">
        <ChevronLeft size={16} aria-hidden="true" /><span>Previous</span>
      </button>
      <div className="pagination-pages">
        {items.map((item, index) => typeof item === 'number' ? (
          <button key={item} type="button" aria-label={`Page ${item}`} aria-current={item === currentPage ? 'page' : undefined} onClick={() => onPageChange(item)}>{item}</button>
        ) : <span className="pagination-gap" key={`${item}-${index}`} aria-hidden="true">…</span>)}
      </div>
      <button type="button" className="pagination-direction" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">
        <span>Next</span><ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  )
}

export default Pagination

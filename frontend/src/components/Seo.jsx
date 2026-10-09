import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PUBLIC_CATEGORIES } from '../config/contentCategories.js'

const ORIGIN = 'https://bigihub.netlify.app'
const pages = {
  ...Object.fromEntries(PUBLIC_CATEGORIES.filter(item => item.model === 'NewsArticle').map(item => [`/${item.slug}`, [`${item.label} | Bigi_Hub`, item.description]])),
  '/sports': ['Sports News | Bigi_Hub', 'Catch up on sports headlines, short summaries and links to original publishers on Bigi_Hub.'],
  '/': ['Bigi_Hub | Jobs, Opportunities & Scholarships', 'Discover jobs, scholarships, grants, fellowships and other opportunities across Nigeria and Africa. Find your next step with Bigi_Hub.'],
  '/jobs': ['Jobs in Nigeria & Africa | Bigi_Hub', 'Explore jobs and internships across Nigeria and Africa. Search by location, job type, work type and experience, and view application details.'],
  '/opportunities': ['Opportunities in Nigeria & Africa | Bigi_Hub', 'Discover grants, fellowships, internships, training, competitions and other opportunities across Nigeria and Africa. Explore eligibility and deadlines.'],
  '/scholarships': ['Scholarships in Nigeria & Africa | Bigi_Hub', 'Explore scholarships and study funding across Nigeria and Africa. Find eligibility, study levels, deadlines and application information.'],
  '/search': ['Search Jobs, Opportunities & Scholarships | Bigi_Hub', 'Search Bigi_Hub for jobs, opportunities and scholarships by title, organization, location or keyword.'],
}

export default function Seo({ title, description, noindex = false, breadcrumbs }) {
  const { pathname } = useLocation()
  const url = ORIGIN + (pathname === '/' ? '/' : pathname.replace(/\/$/, ''))
  const summary = description.replace(/\s+/g, ' ').trim().slice(0, 160)
  const structuredData = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': pathname === '/' ? 'WebSite' : pages[pathname] && pathname !== '/search' ? 'CollectionPage' : 'WebPage', name: title, description: summary, url },
    ...(breadcrumbs ? [{ '@type': 'BreadcrumbList', itemListElement: breadcrumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: ORIGIN + item.path })) }] : []),
  ] }).replace(/</g, '\\u003c')
  useEffect(() => {
    document.title = title
    function meta(attribute, key, value) {
      let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.append(element) }
      element.content = value
    }
    meta('name', 'description', summary)
    meta('name', 'robots', noindex ? 'noindex,follow' : 'index,follow')
    for (const [key, value] of Object.entries({ 'og:title': title, 'og:description': summary, 'og:url': url, 'og:type': 'website', 'og:site_name': 'Bigi_Hub' })) meta('property', key, value)
    for (const [key, value] of Object.entries({ 'twitter:card': 'summary', 'twitter:title': title, 'twitter:description': summary })) meta('name', key, value)
    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical) }
    canonical.href = url
    const script = document.createElement('script'); script.type = 'application/ld+json'; script.id = 'bigi-public-schema'; script.textContent = structuredData; document.head.append(script)
    return () => script.remove()
  }, [title, summary, url, noindex, structuredData])
  return null
}

export function RouteSeo() {
  const { pathname, search } = useLocation()
  if (PUBLIC_CATEGORIES.some(item => pathname.startsWith(`/${item.slug}/`) && /^\/[^/]+\/[^/]+\/?$/.test(pathname))) return null
  const page = pages[pathname]
  const query = new URLSearchParams(search).get('q')?.trim()
  return <Seo title={pathname === '/search' && query ? `Search: ${query.slice(0, 80)} | Bigi_Hub` : page?.[0] || 'Page not found | Bigi_Hub'} description={page?.[1] || 'This page is unavailable. Explore jobs, opportunities and scholarships on Bigi_Hub.'} noindex={!page || pathname === '/search'} />
}

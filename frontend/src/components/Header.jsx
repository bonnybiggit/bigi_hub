import { NAVIGATION_CATEGORIES, NEWS_CATEGORY_IDS, listingPath } from '../config/contentCategories.js'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, Search, X } from 'lucide-react'
import '../styles/navigation.css'

const newsCategories = [...NEWS_CATEGORY_IDS, 'sports'].map(id => NAVIGATION_CATEGORIES.find(category => category.id === id)).filter(Boolean)
const mainCategories = NAVIGATION_CATEGORIES.filter(category => !newsCategories.includes(category))

function Header() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 48rem)').matches)
  const [open, setOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const { pathname } = useLocation()
  const newsActive = newsCategories.some(category => pathname === listingPath(category.id) || pathname.startsWith(`${listingPath(category.id)}/`))
  const header = useRef(null)
  const toggle = useRef(null)
  const newsToggle = useRef(null)
  const newsDropdown = useRef(null)
  function closeNavigation() { setOpen(false); setNewsOpen(false) }
  useEffect(() => {
    const media = window.matchMedia('(max-width: 48rem)')
    function resize(event) { setMobile(event.matches); setOpen(false); setNewsOpen(false) }
    media.addEventListener('change', resize)
    return () => media.removeEventListener('change', resize)
  }, [])
  useEffect(() => {
    if (!mobile) return
    const element = header.current
    function measure() {
      element.style.setProperty('--mobile-navigation-top', `${element.getBoundingClientRect().bottom}px`)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      element.style.removeProperty('--mobile-navigation-top')
    }
  }, [mobile])
  useEffect(() => {
    if (!open && !newsOpen) return
    function dismiss(event) {
      if (event.type === 'keydown' && event.key === 'Escape') {
        if (newsOpen) { setNewsOpen(false); newsToggle.current?.focus() }
        else { setOpen(false); toggle.current?.focus() }
      }
      if (event.type === 'pointerdown') {
        if (!newsDropdown.current?.contains(event.target)) setNewsOpen(false)
        if (!header.current?.contains(event.target)) setOpen(false)
      }
      if (event.type === 'popstate') { setOpen(false); setNewsOpen(false) }
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('popstate', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('popstate', dismiss)
    }
  }, [open, newsOpen])
  return (
    <header className="site-header" ref={header}>
      <Link className="site-brand" to="/" onClick={closeNavigation}>Bigi_Hub</Link>
      <button className="header-menu-toggle" type="button" ref={toggle} aria-controls="primary-navigation" aria-expanded={mobile && open} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => { setOpen(current => !current); setNewsOpen(false) }}>
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>
      <nav id="primary-navigation" className={'header-navigation' + (mobile && open ? ' is-open' : '')} aria-label="Main navigation" inert={mobile && !open} onClick={event => { if (event.target.closest('a')) closeNavigation() }}>
        <div className="header-menu-inner"><ul className="site-nav">
          <li><NavLink to="/" end>Home</NavLink></li>
          {mainCategories.map(category => <li key={category.id}><NavLink to={listingPath(category.id)}>{category.label}</NavLink></li>)}
          <li className="header-news-dropdown" ref={newsDropdown} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setNewsOpen(false) }}>
            <button className={'header-news-toggle' + (newsActive ? ' is-active' : '')} type="button" ref={newsToggle} aria-expanded={newsOpen} aria-controls="news-navigation" onClick={() => setNewsOpen(current => !current)}>News &amp; More <ChevronDown size={16} aria-hidden="true" /></button>
            <ul id="news-navigation" className="header-news-links" hidden={!newsOpen}>
              {newsCategories.map(category => <li key={category.id}><NavLink to={listingPath(category.id)}>{category.label}</NavLink></li>)}
            </ul>
          </li>
          <li className="header-search-item"><NavLink className="header-search" to="/search" aria-label="Search" title="Search"><Search size={20} aria-hidden="true" /></NavLink></li>
        </ul></div>
      </nav>
    </header>
  )
}

export default Header

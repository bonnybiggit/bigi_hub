import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { PUBLIC_CATEGORIES, listingPath } from '../src/config/contentCategories.js'

test('all new news categories reuse attributed article cards and details with their own links', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: Story } = await server.ssrLoadModule('/src/components/SportsStory.jsx')
    const { SportsArticleContent: Content } = await server.ssrLoadModule('/src/pages/SportsDetails.jsx')
    const article = { title: 'Reviewed news headline', slug: 'reviewed-news', summary: 'Short summary', sourceName: 'Publisher', sourceUrl: 'https://publisher.example/story', sourcePublishedAt: '2026-10-09', description: 'FULL ARTICLE', imageUrl: 'https://publisher.example/image' }
    for (const category of PUBLIC_CATEGORIES.filter(item => item.model === 'NewsArticle')) {
      const card = renderToString(createElement(MemoryRouter, {}, createElement(Story, { article, category: category.id })))
      assert.ok(card.includes(category.label)); assert.ok(card.includes(`href="/${category.id}/${article.slug}"`))
      const detail = renderToString(createElement(MemoryRouter, {}, createElement(Content, { article, category: category.id })))
      for (const html of [card, detail]) {
        assert.ok(html.includes(article.summary)); assert.ok(html.includes(article.sourceName)); assert.ok(html.includes(`href="${article.sourceUrl}"`))
        assert.ok(!html.includes('FULL ARTICLE')); assert.ok(!html.includes('<img')); assert.ok(!html.includes('Collected via The News API')); assert.ok(!html.includes('Sports News'))
      }
    }
  } finally { await server.close() }
})

test('registry routes render existing listing/detail pages and navigation', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: App } = await server.ssrLoadModule('/src/App.jsx')
    for (const category of PUBLIC_CATEGORIES) {
      for (const path of [listingPath(category.id), `${listingPath(category.id)}/test-slug`]) {
        const html = renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(App)))
        assert.ok(html.includes('Loading'), `${path} should render its loading state`)
        assert.ok(!html.includes('Page not found'), path)
        for (const nav of PUBLIC_CATEGORIES) assert.ok(html.includes(`href="${listingPath(nav.id)}"`))
        assert.ok(!html.includes('href="/events"'))
      }
    }
  } finally { await server.close() }
})

test('homepage highlights show only essential fields with the correct detail link', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: HomeHighlightCard } = await server.ssrLoadModule('/src/components/HomeHighlightCard.jsx')
    for (const section of ['jobs', 'opportunities', 'scholarships']) {
      const to = `${listingPath(section)}/published-post`
      const html = renderToString(createElement(MemoryRouter, {}, createElement(HomeHighlightCard, {
        section, to, title: 'Published title', category: 'Category badge', organization: 'Source organization',
        location: 'Lagos', description: 'Long source description', compensation: 'Salary value',
        workType: 'Remote', jobType: 'Full-time', deadline: '2099-01-01', deadlineLabel: '1 January 2099',
      })))
      for (const value of ['Published title', 'Category badge', 'Source organization', 'Lagos', `href="${to}"`, section === 'jobs' ? 'View Job' : 'View Details']) {
        assert.ok(html.includes(value), value)
      }
      for (const value of ['Long source description', 'Salary value', 'Remote', 'Full-time', 'Deadline', '2099']) {
        assert.ok(!html.includes(value), value)
      }
    }
  } finally { await server.close() }
})

test('sports cards and article content show attribution and publisher links without full articles or images', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: SportsStory } = await server.ssrLoadModule('/src/components/SportsStory.jsx')
    const { SportsArticleContent } = await server.ssrLoadModule('/src/pages/SportsDetails.jsx')
    const article = { title: 'Reviewed sports headline', slug: 'reviewed-sports-headline', sourceName: 'Original Publisher',
      sourceUrl: 'https://publisher.example/sports', sourcePublishedAt: '2026-10-09T10:00:00Z', summary: 'Short reviewed summary.',
      description: 'FULL PUBLISHER ARTICLE', imageUrl: 'https://publisher.example/image.jpg' }
    for (const Component of [SportsStory, SportsArticleContent]) {
      const html = renderToString(createElement(MemoryRouter, {}, createElement(Component, { article })))
      assert.ok(html.includes(article.title)); assert.ok(html.includes(article.summary))
      assert.ok(html.includes(article.sourceName)); assert.ok(html.includes(`href="${article.sourceUrl}"`))
      assert.ok(!html.includes('FULL PUBLISHER ARTICLE')); assert.ok(!html.includes('<img'))
      assert.ok(!html.includes('Deadline')); assert.ok(!html.includes('View Job'))
    }
    const card = renderToString(createElement(MemoryRouter, {}, createElement(SportsStory, { article })))
    assert.ok(card.includes('href="/sports/reviewed-sports-headline"'))
  } finally { await server.close() }
})

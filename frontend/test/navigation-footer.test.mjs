import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

async function render(path, file) {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: Component } = await server.ssrLoadModule(file)
    return renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(Component)))
  } finally { await server.close() }
}

test('header groups news links in an accessible News & More dropdown', async () => {
  const html = await render('/sports', '/src/components/Header.jsx')
  assert.ok(html.includes('News &amp; More'))
  assert.ok(html.includes('aria-controls="news-navigation"'))
  assert.ok(html.includes('aria-expanded="false"'))
  assert.match(html, /header-news-toggle is-active/)
  for (const label of ['Home', 'Jobs', 'Opportunities', 'Scholarships']) assert.ok(html.includes(label), label)
  assert.match(html, /<a[^>]*aria-label="Search"[^>]*href="\/search"[^>]*><svg/)
  assert.ok(!/>Search</.test(html))
  assert.ok(html.lastIndexOf('href="/search"') > html.lastIndexOf('News &amp; More'))
})

test('ticker builds labelled, linked, shortened items and omits empty categories', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { buildTickerItems, shortHeadline } = await server.ssrLoadModule('/src/hooks/useLatestTicker.js')
    const long = 'word '.repeat(40)
    assert.ok(shortHeadline(long).length <= 70)
    const items = buildTickerItems([
      { category: 'news', article: { title: 'Alpha', slug: 'alpha' } },
      { category: 'technology', article: null },
      { category: 'sports', article: { title: 'Gamma' } },
    ])
    assert.deepEqual(items.map(item => [item.label, item.headline, item.to]), [['News', 'Alpha', '/news/alpha'], ['Sports News', 'Gamma', '/sports']])
  } finally { await server.close() }
})

test('footer keeps the four columns and newsletter form', async () => {
  const html = await render('/', '/src/components/Footer.jsx')
  for (const heading of ['About Bigi_Hub', 'Explore', 'News &amp; More', 'Newsletter']) assert.ok(html.includes(heading), heading)
  assert.ok(html.includes('Join newsletter'))
  assert.match(html, new RegExp(`© (<!-- -->)?${new Date().getFullYear()}(<!-- -->)? Bigi_Hub`))
})

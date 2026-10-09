import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { PUBLIC_CATEGORIES, listingPath } from '../src/config/contentCategories.js'

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

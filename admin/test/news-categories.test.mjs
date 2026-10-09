import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

test('four news admin destinations render manual draft entry and retain category navigation', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: Assistant } = await server.ssrLoadModule('/src/pages/AIPostAssistant.jsx')
    const { adminNavigation, adminSections } = await server.ssrLoadModule('/src/utils/navigation.js')
    for (const category of ['news', 'business', 'technology', 'health']) {
      const html = renderToString(createElement(MemoryRouter, {}, createElement(Assistant, { newsCategory: category })))
      assert.ok(adminNavigation.some(item => item.to === `/${category}`))
      assert.ok(!adminSections.includes(category[0].toUpperCase() + category.slice(1)))
      for (const value of ['Save draft for review', 'Short summary', 'Original publisher', 'Original article URL', 'Original publication date', 'maxLength="600"']) assert.ok(html.includes(value), `${category}: ${value}`)
      for (const value of ['Import sports stories', 'Upload a flyer', 'THE_NEWS_API_KEY', 'GEMINI_API_KEY']) assert.ok(!html.includes(value), `${category}: ${value}`)
    }
  } finally { await server.close() }
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

test('sidebar groups every admin link once and dashboard shows honest empty states', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { adminNavigation, adminNavigationGroups } = await server.ssrLoadModule('/src/utils/navigation.js')
    const grouped = adminNavigationGroups.flatMap(group => group.links.map(link => link.to)).sort()
    assert.deepEqual(grouped, adminNavigation.map(link => link.to).sort())
    const { default: Dashboard } = await server.ssrLoadModule('/src/pages/Dashboard.jsx')
    const html = renderToString(createElement(MemoryRouter, {}, createElement(Dashboard)))
    assert.ok(html.includes('Live statistics are not available yet'))
    assert.ok(!html.includes('Placeholder statistics'))
    for (const link of adminNavigation.filter(link => link.to !== '/')) assert.ok(html.includes(`href="${link.to}"`), link.to)
  } finally { await server.close() }
})

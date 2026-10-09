import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

test('comments moderation covers all categories with hide/restore workflow and navigation', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: Comments } = await server.ssrLoadModule('/src/pages/Comments.jsx')
    const { adminNavigation } = await server.ssrLoadModule('/src/utils/navigation.js')
    const html = renderToString(createElement(Comments))
    for (const value of ['Comments &amp; Moderation', 'Sports', 'News', 'Business', 'Technology', 'Health', 'Visible', 'Hidden', 'Loading comments']) assert.ok(html.includes(value), value)
    assert.ok(adminNavigation.some(item => item.to === '/comments' && item.label === 'Comments & Moderation'))
    assert.ok(!adminNavigation.some(item => item.label === 'Sports Comments'))
  } finally { await server.close() }
})

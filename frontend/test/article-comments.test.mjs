import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

test('shared article comments render a compact immediate-publish form', async () => {
  const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' })
  try {
    const { default: ArticleComments } = await server.ssrLoadModule('/src/components/ArticleComments.jsx')
    for (const category of ['sports', 'news', 'business', 'technology', 'health']) {
      const html = renderToString(createElement(ArticleComments, { category, slug: 'story' }))
      assert.match(html, /Comments/)
      assert.match(html, /No sign-in needed/)
      assert.match(html, /maxLength="60"|maxlength="60"/i)
      assert.match(html, /rows="3"/)
      assert.match(html, />Post</)
      assert.match(html, /Loading comments/)
      assert.doesNotMatch(html, /approval/i)
    }
  } finally { await server.close() }
})

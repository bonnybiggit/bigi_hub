import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

test('latest news merges real records newest first and only allows https images', async () => {
  const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' })
  try {
    const { mergeLatestNews, safeImageUrl } = await server.ssrLoadModule('/src/hooks/useLatestNews.js')
    assert.equal(safeImageUrl('http://x.test/a.jpg'), '')
    assert.equal(safeImageUrl('javascript:alert(1)'), '')
    assert.equal(safeImageUrl('https://x.test/a.jpg'), 'https://x.test/a.jpg')
    const items = mergeLatestNews([
      { category: 'news', articles: [{ slug: 'a', title: 'A', sourcePublishedAt: '2026-01-01', imageUrl: 'https://x.test/a.jpg' }, { title: 'no slug' }] },
      { category: 'sports', articles: [{ slug: 'b', title: 'B', sourcePublishedAt: '2026-02-01', imageUrl: 'http://x.test/b.jpg' }] },
    ], 5)
    assert.deepEqual(items.map(item => item.article.slug), ['b', 'a'])
    assert.equal(items[0].image, '')
    assert.equal(items[1].image, 'https://x.test/a.jpg')
    const { default: LatestNews } = await server.ssrLoadModule('/src/components/LatestNews.jsx')
    const html = renderToString(createElement(MemoryRouter, {}, createElement(LatestNews)))
    assert.match(html, /Latest News/)
    assert.match(html, /Loading latest news/)
  } finally { await server.close() }
})

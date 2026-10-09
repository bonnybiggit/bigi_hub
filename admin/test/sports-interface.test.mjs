import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

test('admin Sports review renders import and filter controls; service uses the protected endpoint without a key', async t => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  const oldWindow = globalThis.window
  globalThis.window = { location: { origin: 'http://localhost:5174' }, dispatchEvent() {} }
  t.after(() => { if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow })
  const calls = []
  const mock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: new URL(url), options })
    return new Response(JSON.stringify({ status: 'ok', data: { imported: 3, duplicates: 0, skipped: 0 } }))
  })
  try {
    const { default: Assistant } = await server.ssrLoadModule('/src/pages/AIPostAssistant.jsx')
    const html = renderToString(createElement(MemoryRouter, {}, createElement(Assistant, { sportsOnly: true })))
    assert.ok(html.includes('Sports News review'))
    assert.ok(html.includes('Import sports stories'))
    assert.ok(html.includes('Sports stories only'))
    assert.ok(html.includes('Importing never approves or publishes'))
    assert.ok(!html.includes('THE_NEWS_API_KEY'))
    assert.equal(calls.length, 0)
    const services = await server.ssrLoadModule('/src/services/aiPosts.service.js')
    assert.equal((await services.importSportsPosts()).data.imported, 3)
    assert.equal(calls[0].url.pathname, '/api/admin/ai-posts/import/sports')
    assert.equal(calls[0].url.search, '')
    assert.equal(calls[0].options.method, 'POST')
    assert.equal(calls[0].options.credentials, 'include')
    assert.equal(calls[0].options.body, '{}')
    mock.mock.mockImplementation(async () => new Response(JSON.stringify({ message: 'The News API request quota or rate limit was reached. Try again later.' }), { status: 502 }))
    await assert.rejects(services.importSportsPosts(), /request quota or rate limit/)
    const { default: Sources } = await server.ssrLoadModule('/src/components/PostSources.jsx')
    const sourceHtml = renderToString(createElement(Sources, { text: 'Original snippet', metadata: { provider: 'thenewsapi', url: 'https://publisher.example/story', attribution: 'Original Publisher' } }))
    assert.ok(sourceHtml.includes('href="https://publisher.example/story"'))
    assert.ok(sourceHtml.includes('Original Publisher'))
  } finally { await server.close() }
})

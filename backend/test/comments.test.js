import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import express from 'express'
import SportsArticle from '../src/models/SportsArticle.js'
import NewsArticle from '../src/models/NewsArticle.js'
import SportsComment from '../src/models/SportsComment.js'
import Admin from '../src/models/Admin.js'
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/comment_tests'
process.env.ADMIN_JWT_SECRET = randomBytes(48).toString('hex')
process.env.ADMIN_ORIGINS = 'http://localhost:5174'
const { publicCommentsRouter, createPublicCommentsRouter, adminCommentsRouter, validateComment, commentRateLimit } = await import('../src/routes/comments.routes.js')
const { issueToken, COOKIE_NAME } = await import('../src/auth/session.js')
const articleId = '123456789abcdef012345678'
const newsArticleId = '223456789abcdef012345678'
function query(value) {
  return { select(fields) { this.fields = fields; return this }, sort() { return this }, skip() { return this }, limit() { return this }, populate() { return this }, maxTimeMS() { return this }, setOptions() { return this }, async lean() {
    if (!this.fields || !Array.isArray(value)) return value
    return value.map(row => Object.fromEntries(['_id', ...this.fields.split(' ')].filter(key => row[key] !== undefined).map(key => [key, row[key]])))
  }, exec: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject) } }
}
test('comment validation and database defaults publish immediately but reject excessive content', () => {
  assert.deepEqual(validateComment({ displayName: ' Guest ', text: ' Hello ' }), { displayName: 'Guest', text: 'Hello' })
  for (const body of [null, [], {}, { displayName: {}, text: 'Hi' }, { displayName: 'a', text: ['Hi'] }, { displayName: ' ', text: 'Hi' }, { displayName: 'x'.repeat(61), text: 'Hi' }, { displayName: 'a', text: 'x'.repeat(1001) }, { displayName: 'a', text: '\u0000' }, { displayName: 'a', text: 'Hi', status: 'approved' }]) assert.equal(validateComment(body), null)
  const comment = new SportsComment({ articleId, displayName: 'Guest', text: 'Hello' })
  assert.equal(comment.status, 'approved'); assert.equal(comment.category, 'sports'); assert.equal(comment.validateSync(), undefined)
  assert.ok(new SportsComment({ articleId, displayName: 'x'.repeat(61), text: 'Hello' }).validateSync())
  assert.ok(new SportsComment({ articleId, displayName: 'Guest', text: 'Hello', category: 'jobs' }).validateSync())
})
test('comments are rate limited with a retry header', () => {
  const limit = commentRateLimit(); let accepted = 0, status, retry
  const response = { set(_key, value) { retry = value }, status(value) { status = value; return this }, json() {} }
  for (let i = 0; i < 6; i++) limit({ ip: 'test' }, response, () => accepted++)
  assert.equal(accepted, 5); assert.equal(status, 429); assert.ok(Number(retry) > 0)
})
test('immediate publishing, multi-category moderation, hide/restore/delete and public visibility', async t => {
  const rows = []
  let nextId = 1
  const admin = { _id: '0123456789abcdef01234567', active: true, sessionVersion: 0 }
  t.mock.method(Admin, 'findById', () => query(admin))
  const guard = filter => {
    assert.equal(filter.status, 'published'); assert.deepEqual(filter.publicationPending, { $ne: true })
    assert.deepEqual(filter.approvedAt, { $exists: true, $ne: null }); assert.deepEqual(filter.publishedAt, { $exists: true, $ne: null })
  }
  t.mock.method(SportsArticle, 'findOne', filter => { guard(filter); assert.equal(filter.category, undefined); return query(filter.slug === 'public-story' ? { _id: articleId } : null) })
  t.mock.method(NewsArticle, 'findOne', filter => { guard(filter); return query(filter.slug === 'tech-story' && filter.category === 'technology' ? { _id: newsArticleId } : null) })
  t.mock.method(SportsArticle, 'find', () => query([{ _id: articleId, title: 'Sports headline', slug: 'public-story' }]))
  t.mock.method(NewsArticle, 'find', () => query([{ _id: newsArticleId, title: 'Tech headline', slug: 'tech-story', category: 'technology' }]))
  const matching = filter => rows.filter(row => Object.entries(filter).every(([key, value]) => value?.$in ? value.$in.includes(row[key]) : row[key] === value))
  t.mock.method(SportsComment, 'create', async data => { const row = { ...data, _id: 'abcdef0123456789abcdef0' + nextId++, createdAt: new Date().toISOString() }; rows.push(row); return row })
  t.mock.method(SportsComment, 'find', filter => query(matching(filter)))
  t.mock.method(SportsComment, 'countDocuments', filter => query(matching(filter).length))
  t.mock.method(SportsComment, 'findByIdAndUpdate', (id, update) => { const row = rows.find(item => item._id === id); if (row) row.status = update.$set.status; return query(row) })
  t.mock.method(SportsComment, 'findByIdAndDelete', id => { const index = rows.findIndex(item => item._id === id); return query(index < 0 ? null : rows.splice(index, 1)[0]) })
  const app = express(); app.use(express.json())
  app.use('/sports/:slug/comments', publicCommentsRouter)
  app.use('/technology/:slug/comments', createPublicCommentsRouter(NewsArticle, 'technology'))
  app.use('/business/:slug/comments', createPublicCommentsRouter(NewsArticle, 'business'))
  app.use('/admin/comments', adminCommentsRouter)
  app.use((error, _request, response, _next) => response.status(error.status || 500).json({ message: error.message }))
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const cookie = `${COOKIE_NAME}=${issueToken(admin)}`
  const request = (path, method = 'GET', body, authenticated = false, origin = 'http://localhost:5174') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Origin: origin, ...(authenticated ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const publicPath = '/sports/public-story/comments', adminPath = '/admin/comments'
  // The shared limiter allows five submissions per IP, so this test uses exactly five POSTs.
  const created = await request(publicPath, 'POST', { displayName: 'Reader', text: '<script>plain text</script>' })
  assert.equal(created.status, 201)
  assert.equal(rows[0].status, 'approved'); assert.equal(rows[0].articleId, articleId); assert.equal(rows[0].category, 'sports'); assert.equal(rows[0].articleModel, 'SportsArticle')
  assert.equal((await created.json()).data.text, '<script>plain text</script>')
  const visible = (await (await request(publicPath)).json()).data
  assert.equal(visible.length, 1); assert.equal(visible[0].text, '<script>plain text</script>')
  assert.deepEqual(Object.keys(visible[0]).sort(), ['_id', 'createdAt', 'displayName', 'text'])
  assert.equal((await request(publicPath, 'POST', { displayName: 'Reader', text: 'Hello', status: 'hidden' })).status, 400)
  assert.equal((await request('/sports/draft-story/comments', 'POST', { displayName: 'Reader', text: 'Hi' })).status, 404)
  assert.equal((await request('/sports/draft-story/comments')).status, 404)
  assert.equal((await request('/technology/tech-story/comments', 'POST', { displayName: 'Tech reader', text: 'Nice' })).status, 201)
  assert.equal((await request('/business/tech-story/comments', 'POST', { displayName: 'Wrong', text: 'Wrong category' })).status, 404)
  assert.equal(rows.length, 2); assert.equal(rows[1].category, 'technology'); assert.equal(rows[1].articleModel, 'NewsArticle'); assert.equal(rows[1].articleId, newsArticleId)
  assert.deepEqual((await (await request('/business/tech-story/comments')).json()).message, 'News story not found.')
  assert.equal((await (await request('/technology/tech-story/comments')).json()).data.length, 1)
  assert.equal((await (await request(publicPath)).json()).data.length, 1, 'comments stay scoped to their own article')
  assert.equal((await request(publicPath + '?status=pending')).status, 400)

  assert.equal((await request(adminPath)).status, 401)
  assert.equal((await request(`${adminPath}/${rows[0]._id}`, 'PATCH', { status: 'hidden' })).status, 401)
  assert.equal((await request(`${adminPath}/${rows[0]._id}`, 'PATCH', { status: 'hidden' }, true, 'https://attacker.test')).status, 403)
  const all = (await (await request(adminPath, 'GET', undefined, true)).json()).data
  assert.equal(all.length, 2); assert.equal(all.find(row => row.category === 'technology').article.title, 'Tech headline'); assert.equal(all.find(row => row.category === 'sports').article.title, 'Sports headline')
  assert.equal((await (await request(adminPath + '?category=technology', 'GET', undefined, true)).json()).data.length, 1)
  assert.equal((await request(adminPath + '?category=jobs', 'GET', undefined, true)).status, 400)
  assert.equal((await request(adminPath + '?status=rejected', 'GET', undefined, true)).status, 400)

  const id = rows[0]._id
  assert.equal((await request(`${adminPath}/${id}`, 'PATCH', { status: 'rejected' }, true)).status, 400)
  assert.equal((await request(`${adminPath}/${id}`, 'PATCH', { status: 'hidden' }, true)).status, 200)
  assert.deepEqual((await (await request(publicPath)).json()).data, [])
  assert.equal((await (await request(adminPath + '?status=hidden', 'GET', undefined, true)).json()).data.length, 1)
  assert.equal((await request(`${adminPath}/${id}`, 'PATCH', { status: 'approved' }, true)).status, 200)
  assert.equal((await (await request(publicPath)).json()).data.length, 1)
  assert.equal((await request(`${adminPath}/${id}`, 'DELETE', undefined, true)).status, 200)
  assert.deepEqual((await (await request(publicPath)).json()).data, [])
  assert.equal((await request(`${adminPath}/${id}`, 'DELETE', undefined, true)).status, 404)
})

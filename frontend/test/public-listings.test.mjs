import assert from 'node:assert/strict'
import test from 'node:test'
import apiClient from '../src/services/apiClient.js'
import { getJobs, getJobBySlug } from '../src/services/jobs.service.js'
import { getOpportunities, getOpportunityBySlug } from '../src/services/opportunities.service.js'
import { getScholarships, getScholarshipBySlug } from '../src/services/scholarships.service.js'
import { PRODUCTION_API_URL, resolveApiBaseUrl } from '../src/utils/apiBaseUrl.js'
import { listingHighlights } from '../src/utils/listingHighlights.js'
import { subscribeListingRefresh } from '../src/utils/listingRefresh.js'
import { PUBLIC_CATEGORIES, NAVIGATION_CATEGORIES, listingPath, detailPath } from '../src/config/contentCategories.js'

test('public route/navigation configuration preserves the three listing and detail paths', () => {
  assert.deepEqual(NAVIGATION_CATEGORIES.map(item => item.label), ['Jobs', 'Opportunities', 'Scholarships'])
  assert.deepEqual(PUBLIC_CATEGORIES.map(item => listingPath(item.id)), ['/jobs', '/opportunities', '/scholarships'])
  for (const item of PUBLIC_CATEGORIES) {
    assert.equal(detailPath(item.id, 'published-title'), `/${item.slug}/published-title`)
    assert.equal(item.apiPath, listingPath(item.id))
  }
  assert.throws(() => listingPath('events'), /Unsupported/)
})

test('production configuration resolves Render with the required /api path', () => {
  for (const value of [undefined, '', '  ', 'http://localhost:5000/api', 'http://127.0.0.1:5000/api', 'https://bigi-hub-api.onrender.com', PRODUCTION_API_URL + '/']) {
    assert.equal(resolveApiBaseUrl(value, true), PRODUCTION_API_URL)
  }
  assert.equal(resolveApiBaseUrl(undefined, false), 'http://localhost:5000/api')
  assert.equal(apiClient.defaults.baseURL, PRODUCTION_API_URL)
})

for (const [section, list, detail] of [['jobs', getJobs, getJobBySlug], ['opportunities', getOpportunities, getOpportunityBySlug], ['scholarships', getScholarships, getScholarshipBySlug]]) {
  test(`${section} uses real endpoint paths and response envelopes for listings and details`, async t => {
    const record = { _id: '0123456789abcdef01234567', slug: 'published-record', title: 'Published record', deadline: '2099-01-01T00:00:00Z' }
    const pagination = { page: 1, limit: 100, total: 1, totalPages: 1 }
    const requests = []
    const originalAdapter = apiClient.defaults.adapter
    t.after(() => { apiClient.defaults.adapter = originalAdapter })
    apiClient.defaults.adapter = async config => {
      requests.push(config)
      return { data: { status: 'ok', data: config.url === `/${section}` ? [record] : record, pagination }, status: 200, statusText: 'OK', headers: {}, config }
    }
    const response = await list({ page: 1, limit: 100, search: 'Published' })
    assert.deepEqual(response.data, [record]); assert.deepEqual(response.pagination, pagination)
    assert.equal(requests[0].url, `/${section}`)
    assert.equal(apiClient.getUri(requests[0]), `${PRODUCTION_API_URL}/${section}?page=1&limit=100&search=Published`)
    const found = await detail(record.slug)
    assert.equal(found.id, record._id)
    assert.equal(requests[1].url, `/${section}/${record.slug}`)
    apiClient.defaults.adapter = async () => { throw Object.assign(new Error('Not found'), { response: { status: 404 } }) }
    assert.equal(await detail('expired-record'), null)
    apiClient.defaults.adapter = async () => { throw Object.assign(new Error('Service unavailable'), { response: { status: 503 } }) }
    await assert.rejects(list(), /Service unavailable/)
    await assert.rejects(detail(record.slug), /Service unavailable/)
    apiClient.defaults.adapter = async config => ({ data: { status: 'ok', data: null }, status: 200, headers: {}, config })
    await assert.rejects(detail(record.slug), /Invalid listing response/)
    await assert.rejects(list(), /Invalid listing response/)
  })
}

test('homepage highlights contain live records from all destinations with matching detail links', () => {
  const item = { _id: 'mongo-id', slug: 'reviewed-title-mongo-id', title: 'Reviewed title', deadline: '2099-01-01', listedDate: '2026-10-09' }
  const cards = listingHighlights([{ ...item, jobType: 'Full-time' }], [{ ...item, category: 'Grants' }], [item])
  assert.deepEqual(cards.map(card => card.to), ['jobs', 'opportunities', 'scholarships'].map(section => `/${section}/${item.slug}`))
  assert.ok(cards.every(card => card.id === item._id && card.deadlineLabel && card.title === item.title))
  assert.deepEqual(listingHighlights([], [], []), [])
  const newest = { ...item, _id: 'newest', slug: 'newest', listedDate: '2026-10-10' }
  assert.equal(listingHighlights([item, item, item, newest], [], [])[0].id, 'newest')
})

test('listings refresh on focus and visible polling and clean up listeners', () => {
  const windowTarget = new EventTarget(), documentTarget = new EventTarget()
  let tick, calls = 0, cancelled = false
  const stop = subscribeListingRefresh(() => calls++, { windowTarget, documentTarget,
    schedule: callback => { tick = callback; return 1 }, cancel: () => { cancelled = true } })
  windowTarget.dispatchEvent(new Event('focus')); tick(); assert.equal(calls, 2)
  documentTarget.hidden = true; tick(); assert.equal(calls, 2)
  documentTarget.hidden = false; documentTarget.dispatchEvent(new Event('visibilitychange')); assert.equal(calls, 3)
  stop(); assert.equal(cancelled, true)
  windowTarget.dispatchEvent(new Event('focus')); assert.equal(calls, 3)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { CATEGORY_REGISTRY, PUBLIC_CATEGORIES, PUBLIC_DESTINATIONS, OPPORTUNITY_CATEGORIES, NAVIGATION_CATEGORIES, publicCategory, listingPath, detailPath } from '../src/config/content-categories.js'
import { validateDestination, POST_TYPES } from '../src/validation/ai-posts.js'
import Job from '../src/models/Job.js'
import Opportunity from '../src/models/Opportunity.js'
import Scholarship from '../src/models/Scholarship.js'
import SportsArticle from '../src/models/SportsArticle.js'
import NewsArticle from '../src/models/NewsArticle.js'
import AssistantPost from '../src/models/AssistantPost.js'

test('category metadata preserves existing destinations, paths, models and supported fields', () => {
  assert.deepEqual(PUBLIC_DESTINATIONS, ['jobs', 'opportunities', 'scholarships', 'sports', 'news', 'business', 'technology', 'health'])
  assert.deepEqual(AssistantPost.schema.path('destination').enumValues, ['', ...PUBLIC_DESTINATIONS])
  assert.equal(new Set(CATEGORY_REGISTRY.map(item => item.id)).size, CATEGORY_REGISTRY.length)
  assert.equal(new Set(PUBLIC_CATEGORIES.map(item => item.slug)).size, PUBLIC_CATEGORIES.length)
  const models = { Job, Opportunity, Scholarship, SportsArticle, NewsArticle }
  for (const category of PUBLIC_CATEGORIES) {
    assert.ok(Object.isFrozen(category)); assert.ok(Object.isFrozen(category.fields))
    assert.equal(publicCategory(category.id), category)
    assert.equal(listingPath(category.id), `/${category.id}`)
    assert.equal(detailPath(category.id, 'reviewed-title'), `/${category.id}/reviewed-title`)
    assert.equal(category.apiPath, category.id === 'health' ? '/health-news' : `/${category.id}`)
    assert.ok(models[category.model])
    for (const field of category.fields) assert.ok(models[category.model].schema.path(field), `${category.id}: ${field}`)
    validateDestination(category.id, category.id === 'opportunities' ? 'Grants' : '')
  }
  assert.deepEqual(NAVIGATION_CATEGORIES.map(item => item.id), PUBLIC_DESTINATIONS)
  assert.equal(CATEGORY_REGISTRY.some(item => item.id === 'events'), false)
})

test('opportunity registry preserves stored enum values and does not turn classification into destination', () => {
  assert.deepEqual(OPPORTUNITY_CATEGORIES, ['Scholarships', 'Grants', 'Fellowships', 'Internships', 'Graduate Programs', 'Training', 'Competitions', 'Volunteering'])
  assert.deepEqual(Opportunity.schema.path('category').enumValues, [...OPPORTUNITY_CATEGORIES])
  for (const label of OPPORTUNITY_CATEGORIES) validateDestination('opportunities', label)
  for (const id of ['', 'events', 'grants', 'internships', 'Job', 'Other']) {
    assert.throws(() => validateDestination(id), error => error.status === 400 && Boolean(error.errors.destination))
    assert.throws(() => publicCategory(id), /Unsupported/)
  }
  assert.throws(() => validateDestination('opportunities', 'Events'), error => error.status === 400)
  assert.throws(() => validateDestination('opportunities'), error => error.status === 400)
  assert.ok(POST_TYPES.includes('Event')); assert.ok(POST_TYPES.includes('Other'))
})

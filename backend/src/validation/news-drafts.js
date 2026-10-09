import { NEWS_CATEGORY_IDS } from '../config/content-categories.js'
import { applicationUrlValidation } from './listings.js'
import { inputError } from './ai-posts.js'

export function validateNewsDraft(body) {
  const keys = ['category', 'title', 'summary', 'sourceUrl', 'sourceName', 'sourcePublishedAt']
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !keys.includes(key)) || keys.some(key => typeof body[key] !== 'string')) throw inputError('Supply only the news category, title, short summary and original publisher details.')
  const value = Object.fromEntries(keys.map(key => [key, body[key].trim()]))
  if (!NEWS_CATEGORY_IDS.includes(value.category)) throw inputError('Select a supported news category.')
  for (const [key, maximum] of [['title', 500], ['summary', 600], ['sourceName', 500], ['sourceUrl', 2000]]) {
    if (!value[key] || value[key].length > maximum) throw inputError(`${key} must contain 1–${maximum} characters.`)
  }
  if (!applicationUrlValidation.validator(value.sourceUrl)) throw inputError('Use an absolute HTTP or HTTPS original publisher URL without credentials.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.sourcePublishedAt) || !Number.isFinite(Date.parse(value.sourcePublishedAt)) || new Date(value.sourcePublishedAt).toISOString().slice(0, 10) !== value.sourcePublishedAt) throw inputError('Enter the original publication date as YYYY-MM-DD.')
  return value
}

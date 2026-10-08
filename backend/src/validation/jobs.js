import { applicationUrlValidation, slugValidation } from './listings.js'

const requiredText = { title: 200, slug: 200, organization: 200, description: 6000, location: 200, countryCode: 2, jobType: 100 }
const optionalText = { workType: 20, experienceLevel: 100, compensation: 200, applyUrl: 2000 }
export function validateJobBody(body, partial = false) {
  const fields = new Set([...Object.keys(requiredText), ...Object.keys(optionalText), 'deadline', 'requirements', 'benefits', ...(partial ? ['archived'] : [])])
  const errors = {}
  const data = {}
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) {
    return { data, errors: { form: 'Enter job details.' } }
  }
  if (Object.keys(body).some(key => !fields.has(key))) errors.form = 'Unsupported job field.'
  for (const [key, maximum] of Object.entries({ ...requiredText, ...optionalText })) {
    if (!(key in body)) {
      if (!partial && key in requiredText) errors[key] = 'This field is required.'
      continue
    }
    if (typeof body[key] !== 'string') { errors[key] = 'Enter a text value.'; continue }
    const value = body[key].trim()
    if (key in requiredText && !value) errors[key] = 'This field is required.'
    if (value.length > maximum) errors[key] = `Use at most ${maximum} characters.`
    data[key] = key === 'countryCode' ? value.toUpperCase() : value
  }
  if ('slug' in data && !slugValidation.validator(data.slug)) errors.slug = slugValidation.message
  if ('countryCode' in data && !['NG', 'GH', 'KE', 'ZA', 'RW', 'SN'].includes(data.countryCode)) errors.countryCode = 'Select a supported country.'
  if ('workType' in data && !['', 'Remote', 'Hybrid', 'On-site'].includes(data.workType)) errors.workType = 'Select Remote, Hybrid or On-site.'
  if ('applyUrl' in data && !applicationUrlValidation.validator(data.applyUrl)) errors.applyUrl = applicationUrlValidation.message
  if ('deadline' in body) {
    const value = body.deadline
    const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00.000Z') : null
    if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) errors.deadline = 'Enter a valid deadline (YYYY-MM-DD).'
    else data.deadline = date
  } else if (!partial) errors.deadline = 'This field is required.'
  for (const key of ['requirements', 'benefits']) {
    if (!(key in body)) continue
    const values = body[key]
    if (!Array.isArray(values) || values.length > 20 || values.some(value => typeof value !== 'string' || !value.trim() || value.trim().length > 500)) {
      errors[key] = 'Use up to 20 non-empty items, each at most 500 characters.'
    } else data[key] = values.map(value => value.trim())
  }
  if (partial && 'archived' in body) {
    if (typeof body.archived !== 'boolean') errors.archived = 'archived must be true or false.'
    else data.archivedAt = body.archived ? new Date() : null
  }
  return { data, errors }
}

export function jobFilter(query) {
  const filters = []
  const text = value => ({ $regex: value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' })
  if (query.search?.trim()) filters.push({ $or: ['title', 'slug', 'organization', 'description', 'location'].map(key => ({ [key]: text(query.search) })) })
  for (const [key, field] of [['location', 'location'], ['jobType', 'jobType'], ['workType', 'workType'], ['experience', 'experienceLevel']]) {
    if (query[key] !== undefined) filters.push({ [field]: text(query[key]) })
  }
  if (query.status === 'active') filters.push({ archivedAt: null })
  if (query.status === 'archived') filters.push({ archivedAt: { $ne: null } })
  return filters.length ? { $and: filters } : {}
}

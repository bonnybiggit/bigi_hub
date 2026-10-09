import { createHash } from 'node:crypto'
import { applicationUrlValidation } from './listings.js'
import { PUBLIC_DESTINATIONS, OPPORTUNITY_CATEGORIES } from '../config/content-categories.js'
export { PUBLIC_DESTINATIONS, OPPORTUNITY_CATEGORIES } from '../config/content-categories.js'

export const POST_TYPES = ['Job', 'Scholarship', 'Grant', 'Fellowship', 'Internship', 'Training', 'Competition', 'Event', 'Other']
export function validateDestination(destination, opportunityCategory = '') {
  if (!PUBLIC_DESTINATIONS.includes(destination)) throw inputError('Explicitly select a supported public destination before approval/publication.', { destination: 'Select a public destination.' })
  if (destination === 'opportunities' && !OPPORTUNITY_CATEGORIES.includes(opportunityCategory)) throw inputError('Select a supported opportunity category.', { opportunityCategory: 'Select the public opportunity category.' })
}
export const POST_FIELDS = { title: 500, organization: 500, location: 500, jobType: 200, workType: 200, experience: 1000, salary: 1000, description: 12000, responsibilities: 8000, requirements: 8000, howToApply: 8000, applicationEmail: 254, applicationUrl: 2000, deadline: 500 }
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
export const cleanMissing = value => value == null || /^\s*(not specified|unknown|n\/a)\s*$/i.test(value) ? '' : value.trim()
export function inputError(message, errors = {}) { return Object.assign(new Error(message), { status: 400, errors }) }
export function validateSource(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(key => !['text', 'image'].includes(key))) throw inputError('Provide copied text, a flyer image, or both.')
  if (body.text !== undefined && (typeof body.text !== 'string' || body.text.length > 20000)) throw inputError('Copied text must be at most 20,000 characters.')
  const text = body.text || '' // Keep the exact original, including whitespace.
  let image = null
  if (body.image != null) {
    const value = body.image
    if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['name', 'dataUrl'].includes(key)) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 200 || typeof value.dataUrl !== 'string') throw inputError('Select a valid flyer image.')
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value.dataUrl)
    if (!match || match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw inputError('Use a PNG, JPEG or WebP flyer up to 4MB.')
    const data = Buffer.from(match[2], 'base64')
    if (!data.length || data.length > MAX_IMAGE_BYTES || data.toString('base64') !== match[2]) throw inputError('Invalid image encoding or image too large.')
    const mimeType = match[1]
    const valid = mimeType === 'image/png' ? data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      : mimeType === 'image/jpeg' ? data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
        : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP'
    if (!valid) throw inputError('The image content does not match its file type.')
    image = { name: value.name, mimeType, size: data.length, sha256: createHash('sha256').update(data).digest('hex'), data }
  }
  if (!text.trim() && !image) throw inputError('Paste text or upload a flyer before analyzing.')
  return { text, image }
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00.000Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function sourceDeadline(value) {
  if (!value) return ''
  const isoDates = [...value.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)]
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
  const dayDates = [...value.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)[,\s]+(\d{4})\b/gi)]
  const monthDates = [...value.matchAll(/\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})\b/gi)]
  if (isoDates.length + dayDates.length + monthDates.length !== 1) return ''
  if (isoDates.length) return validDate(isoDates[0][1]) ? isoDates[0][1] : ''
  const dayFirst = dayDates[0], monthFirst = monthDates[0]
  const match = dayFirst || monthFirst
  if (!match) return '' // Never infer a year or resolve ambiguous numeric dates.
  const month = (dayFirst ? match[2] : match[1]).toLowerCase()
  const index = months.findIndex(name => name === month || name.slice(0, 3) === month)
  const result = `${match[3]}-${String(index + 1).padStart(2, '0')}-${String(dayFirst ? match[1] : match[2]).padStart(2, '0')}`
  return index >= 0 && validDate(result) ? result : ''
}
export function validateReview(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['revision', 'postType', 'fields', 'deadlineDate', 'destination', 'opportunityCategory'].includes(key)) || !Number.isInteger(body.revision) || body.revision < 0) throw inputError('Provide the current draft revision and review fields.')
  const errors = {}, fields = {}
  const destination = body.destination ?? '', opportunityCategory = body.opportunityCategory ?? ''
  if (typeof destination !== 'string' || (destination !== '' && !PUBLIC_DESTINATIONS.includes(destination))) errors.destination = 'Select a supported public destination.'
  if (typeof opportunityCategory !== 'string' || (opportunityCategory !== '' && !OPPORTUNITY_CATEGORIES.includes(opportunityCategory))) errors.opportunityCategory = 'Select a supported opportunity category.'
  if (!POST_TYPES.includes(body.postType)) errors.postType = 'Select a supported post type.'
  if (!body.fields || typeof body.fields !== 'object' || Array.isArray(body.fields) || Object.keys(body.fields).some(key => !Object.hasOwn(POST_FIELDS, key))) throw inputError('Invalid review fields.')
  for (const [key, maximum] of Object.entries(POST_FIELDS)) {
    if (typeof body.fields[key] !== 'string' || body.fields[key].length > maximum) errors[key] = `Enter text of at most ${maximum} characters.`
    else fields[key] = cleanMissing(body.fields[key])
  }
  if (fields.applicationUrl && !applicationUrlValidation.validator(fields.applicationUrl)) errors.applicationUrl = 'Use an absolute HTTP or HTTPS URL without credentials.'
  if (fields.applicationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.applicationEmail)) errors.applicationEmail = 'Enter a valid application email.'
  const deadlineDate = body.deadlineDate || ''
  if (typeof body.deadlineDate !== 'string' || (deadlineDate && !validDate(deadlineDate))) errors.deadlineDate = 'Confirm a valid application deadline date.'
  if (fields.deadline && !deadlineDate) errors.deadlineDate = 'Confirm the date of the deadline stated in the source.'
  if (deadlineDate && !fields.deadline) errors.deadlineDate = 'A deadline date needs a deadline in the reviewed source fields.'
  const statedDate = sourceDeadline(fields.deadline)
  if (statedDate && deadlineDate !== statedDate) errors.deadlineDate = 'The confirmed date must match the deadline stated in the source.'
  if (Object.keys(errors).length) throw inputError('Check the highlighted review fields.', errors)
  return { fields, postType: body.postType, deadlineDate, destination, opportunityCategory: destination === 'opportunities' ? opportunityCategory : '' }
}
export function validateRevision(body, approving = false) {
  const allowed = approving ? ['revision', 'confirmed'] : ['revision']
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key)) || !Number.isInteger(body.revision) || body.revision < 0 || (approving && body.confirmed !== true)) throw inputError(approving ? 'Confirm that you reviewed the source and fields before approving.' : 'Provide the approved revision.')
  return body.revision
}

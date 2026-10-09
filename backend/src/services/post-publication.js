import mongoose from 'mongoose'
import Job from '../models/Job.js'
import Scholarship from '../models/Scholarship.js'
import Opportunity from '../models/Opportunity.js'
import AssistantPost from '../models/AssistantPost.js'
import { inputError } from '../validation/ai-posts.js'
import { expiryDate } from './post-expiry.js'

const categories = { Grant: 'Grants', Fellowship: 'Fellowships', Internship: 'Internships', Training: 'Training', Competition: 'Competitions' }
const countries = [['NG', 'Nigeria'], ['GH', 'Ghana'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['RW', 'Rwanda'], ['SN', 'Senegal']]
const missing = value => value?.trim() || 'Not specified'

export function publicListing(post, now = new Date()) {
  const Model = post.postType === 'Job' ? Job : post.postType === 'Scholarship' ? Scholarship : Object.hasOwn(categories, post.postType) ? Opportunity : null
  if (!Model) throw inputError(`${post.postType} has no public listing destination. Select a supported type before approving and publishing.`, { postType: 'Event and Other cannot be published to the public listings.' })
  const fields = post.fields
  if (!fields.title?.trim()) throw inputError('A reviewed title is required for public publication.', { title: 'Enter the source title before approving.' })
  // No default country: use only an explicit supported name/code in reviewed location.
  const matching = countries.filter(([code, name]) => new RegExp(`\\b(?:${code}|${name})\\b`, 'i').test(fields.location || ''))
  if (matching.length !== 1) throw inputError('Public listings require one supported country in the reviewed location (Nigeria/NG, Ghana/GH, Kenya/KE, South Africa/ZA, Rwanda/RW or Senegal/SN). Return to editing and confirm it from the source.', { location: 'Include one supported country name or code from the source.' })
  const expiresAt = expiryDate(now, post.deadlineDate)
  const base = fields.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160).replace(/-$/g, '') || 'post'
  const data = {
    _id: post._id, title: fields.title, slug: `${base}-${post._id}`,
    organization: missing(fields.organization), location: fields.location, countryCode: matching[0][0],
    description: missing(fields.description || post.sourceText || post.imageText),
    deadline: expiresAt, listedDate: now, applyUrl: fields.applicationUrl || undefined,
  }
  // Keep reviewed source instructions in the only public schema's long-text field.
  for (const [key, label] of [['responsibilities', 'Responsibilities'], ['howToApply', 'How to apply'], ['applicationEmail', 'Application email']]) {
    if (fields[key] && !data.description.includes(fields[key])) data.description += `\n\n${label}:\n${fields[key]}`
  }
  if (Model === Job) Object.assign(data, {
    jobType: missing(fields.jobType), experienceLevel: fields.experience || undefined,
    compensation: fields.salary || undefined, requirements: fields.requirements ? [fields.requirements] : [],
    archivedAt: expiresAt <= now ? now : null,
  })
  else Object.assign(data, { eligibility: fields.requirements || undefined, funding: fields.salary || undefined, ...(Model === Opportunity ? { category: categories[post.postType] } : {}) })
  if (Model === Job && fields.workType) {
    const workType = ['Remote', 'Hybrid', 'On-site'].find(value => value.toLowerCase() === fields.workType.toLowerCase())
    if (!workType) throw inputError('Check the reviewed work type before publication.', { workType: 'Use Remote, Hybrid or On-site, or leave it empty when not specified.' })
    data.workType = workType
  }
  return { listing: new Model(data), expiresAt }
}

export async function publishPublicPost(current, revision, adminId) {
  const now = new Date()
  const { listing, expiresAt } = publicListing(current, now)
  await listing.validate()
  try {
    return await mongoose.connection.transaction(async session => {
      // Claim this exact approved revision inside the same transaction as insertion.
      const post = await AssistantPost.findOneAndUpdate({ _id: current._id, revision, status: 'approved' }, {
        $set: { status: expiresAt <= now ? 'archived' : 'published', publishedBy: adminId, publishedAt: now, expiresAt, ...(expiresAt <= now ? { archivedAt: now } : {}) },
        $inc: { revision: 1 },
      }, { new: true, runValidators: true, session }).maxTimeMS(3000).setOptions({ timeoutMS: 5000 }).select('+sourceImage.data')
      if (!post) throw Object.assign(new Error('The post changed or was already published. Reload it before continuing.'), { status: 409 })
      // Sharing the assistant ID makes duplicate insertion impossible without new fields.
      // A new document per transaction attempt also permits driver retries after aborts.
      await new listing.constructor(listing.toObject()).save({ session, timeoutMS: 5000 })
      return post
    }, { maxCommitTimeMS: 5000 })
  } catch (error) {
    if (error.code === 11000) throw Object.assign(new Error('This post already has a public listing. Publication was not duplicated.'), { status: 409 })
    if (error.code === 20 || error.codeName === 'IllegalOperation') throw Object.assign(new Error('Atomic publication requires a MongoDB replica set or Atlas. Nothing was published; check the backend database setup.'), { status: 503 })
    throw error
  }
}

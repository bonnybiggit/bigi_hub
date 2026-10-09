import mongoose from 'mongoose'
import Job from '../models/Job.js'
import Scholarship from '../models/Scholarship.js'
import Opportunity from '../models/Opportunity.js'
import AssistantPost from '../models/AssistantPost.js'
import { inputError, validateDestination } from '../validation/ai-posts.js'
import { expiryDate } from './post-expiry.js'
import { publicCategory } from '../config/content-categories.js'

const countries = [['NG', 'Nigeria'], ['GH', 'Ghana'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['RW', 'Rwanda'], ['SN', 'Senegal']]
const missing = value => value?.trim() || 'Not specified'

export async function publicationCapability() {
  if (mongoose.connection.readyState !== 1) return { transactions: 'unknown', publicationMode: 'automatic' }
  let session
  try {
    session = await mongoose.startSession()
    session.startTransaction()
    await AssistantPost.findOne().select('_id').session(session).maxTimeMS(3000)
    await session.abortTransaction()
    return { transactions: 'supported', publicationMode: 'transaction' }
  } catch (error) {
    if (session?.inTransaction()) await session.abortTransaction().catch(() => {})
    return error.code === 20 || error.codeName === 'IllegalOperation'
      ? { transactions: 'unsupported', publicationMode: 'staged-resumable' }
      : { transactions: 'unknown', publicationMode: 'automatic' }
  } finally { if (session) await session.endSession() }
}

export async function reopenLegacyPublication(id, revision) {
  const filter = { _id: id, revision, status: { $in: ['published', 'archived'] }, publicRecordId: null, publicationState: { $ne: 'pending' } }
  const current = await bounded(AssistantPost.findOne(filter))
  if (!current) throw conflict()
  const existing = await Promise.all([Job, Scholarship, Opportunity].map(Model => bounded(Model.findOne({ _id: id }).select('_id'))))
  if (existing.some(Boolean)) throw Object.assign(new Error('A public record already exists. This action cannot reset or duplicate a public publication.'), { status: 409 })
  const draft = await bounded(AssistantPost.findOneAndUpdate(filter, {
    $set: { status: 'review', destination: '', opportunityCategory: '' },
    $unset: { approvedBy: 1, approvedAt: 1, publishedBy: 1, publishedAt: 1, expiresAt: 1, archivedAt: 1 },
    $inc: { revision: 1 },
  }, { new: true, runValidators: true }).select('+sourceImage.data'))
  if (!draft) throw conflict()
  return draft
}

export function publicListing(post, now = new Date()) {
  validateDestination(post.destination, post.opportunityCategory)
  const Model = { Job, Scholarship, Opportunity }[publicCategory(post.destination).model]
  if (!Model) throw inputError('This destination has no publication model configured.')
  const fields = post.fields
  if (!fields.title?.trim()) throw inputError('A reviewed title is required for public publication.', { title: 'Enter the source title before approving.' })
  // No default country: use only an explicit supported name/code in reviewed location.
  const matching = countries.filter(([code, name]) => new RegExp(`\\b(?:${code}|${name})\\b`, 'i').test(fields.location || ''))
  if (matching.length !== 1) throw inputError('Public listings require one supported country in the reviewed location (Nigeria/NG, Ghana/GH, Kenya/KE, South Africa/ZA, Rwanda/RW or Senegal/SN). Return to editing and confirm it from the source.', { location: 'Include one supported country name or code from the source.' })
  const expiresAt = expiryDate(now, post.deadlineDate)
  const base = fields.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160).replace(/-$/g, '') || 'post'
  const data = {
    _id: post._id, assistantPostId: post._id, title: fields.title, slug: `${base}-${post._id}`,
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
  else Object.assign(data, { eligibility: fields.requirements || undefined, funding: fields.salary || undefined, ...(Model === Opportunity ? { category: post.opportunityCategory } : {}) })
  if (Model === Job && fields.workType) {
    const workType = ['Remote', 'Hybrid', 'On-site'].find(value => value.toLowerCase() === fields.workType.toLowerCase())
    if (!workType) throw inputError('Check the reviewed work type before publication.', { workType: 'Use Remote, Hybrid or On-site, or leave it empty when not specified.' })
    data.workType = workType
  }
  return { listing: new Model(data), expiresAt }
}


const bounded = query => query.maxTimeMS(3000).setOptions({ timeoutMS: 5000 })
const conflict = () => Object.assign(new Error('The post changed or was already published. Reload it before continuing.'), { status: 409 })
function publicationFields(current, listing, expiresAt, now) {
  const completedAt = new Date(), expired = expiresAt <= completedAt
  return { status: expired ? 'archived' : 'published', publishedBy: current.publishedBy,
    publishedAt: now, expiresAt, publicRecordId: listing._id, publicSlug: listing.slug,
    publicationState: 'complete', ...(expired ? { archivedAt: completedAt } : {}) }
}

// A durable draft link precedes insertion; staged public records stay hidden.
// Every phase is idempotent and can resume after a timeout or process restart.
async function publishWithoutTransactions(current, revision, adminId) {
  let claimed = current
  if (current.publicationState !== 'pending') {
    const now = new Date(), prepared = publicListing(current, now)
    claimed = await bounded(AssistantPost.findOneAndUpdate({ _id: current._id, revision, status: 'approved', publicRecordId: null, publicationState: { $ne: 'pending' } }, {
      $set: { publicationState: 'pending', publicationRevision: revision, publicationStartedAt: now,
        publicRecordId: prepared.listing._id, publicSlug: prepared.listing.slug, publishedBy: adminId }, $inc: { revision: 1 },
    }, { new: true, runValidators: true }).select('+sourceImage.data'))
    if (!claimed) throw conflict()
  }
  const now = claimed.publicationStartedAt
  const { listing, expiresAt } = publicListing(claimed, now)
  await listing.validate()
  const Model = listing.constructor
  await Model.updateOne({ _id: listing._id, assistantPostId: claimed._id }, {
    $setOnInsert: { ...listing.toObject(), publicationPending: true },
  }, { upsert: true, runValidators: true, maxTimeMS: 3000, timeoutMS: 5000 })
  const linked = await bounded(AssistantPost.findOneAndUpdate({ _id: claimed._id, publicRecordId: listing._id, publicationState: 'pending' }, {
    $set: { ...publicationFields(claimed, listing, expiresAt, now), publicationState: 'pending' },
  }, { new: true, runValidators: true }).select('+sourceImage.data'))
  if (!linked) throw conflict()
  const activation = await Model.updateOne({ _id: listing._id, assistantPostId: claimed._id }, { $set: { publicationPending: false } }, { maxTimeMS: 3000, timeoutMS: 5000 })
  if (activation.matchedCount !== 1) throw Object.assign(new Error('The staged public record is missing. Publication remains pending; retry to restore it safely.'), { status: 503 })
  const complete = await bounded(AssistantPost.findOneAndUpdate({ _id: claimed._id, publicRecordId: listing._id, publicationState: 'pending' }, {
    $set: { publicationState: 'complete' },
  }, { new: true, runValidators: true }).select('+sourceImage.data'))
  if (complete) return complete
  const finished = await bounded(AssistantPost.findOne({ _id: claimed._id, publicRecordId: listing._id, publicationState: 'complete' }).select('+sourceImage.data'))
  if (!finished) throw conflict()
  return finished
}

export async function publishPublicPost(current, revision, adminId) {
  if (current.publicationState === 'pending') {
    try { return await publishWithoutTransactions(current, revision, adminId) } catch (error) {
      if (error.code === 11000) throw Object.assign(new Error('A conflicting public record exists. Publication remains linked and pending; contact an administrator.'), { status: 409 })
      throw error
    }
  }
  const now = new Date()
  const { listing, expiresAt } = publicListing(current, now)
  await listing.validate()
  try {
    return await mongoose.connection.transaction(async session => {
      const post = await bounded(AssistantPost.findOneAndUpdate({ _id: current._id, revision, status: 'approved', publicRecordId: null, publicationState: { $ne: 'pending' } }, {
        $set: { ...publicationFields({ publishedBy: adminId }, listing, expiresAt, now), publicationRevision: revision }, $inc: { revision: 1 },
      }, { new: true, runValidators: true, session }).select('+sourceImage.data'))
      if (!post) throw conflict()
      await new listing.constructor(listing.toObject()).save({ session, timeoutMS: 5000 })
      return post
    }, { maxCommitTimeMS: 5000 })
  } catch (error) {
    if (error.code === 20 || error.codeName === 'IllegalOperation') {
      try { return await publishWithoutTransactions(current, revision, adminId) } catch (failure) {
        if (failure.code === 11000) throw Object.assign(new Error('A conflicting public record exists. Publication remains linked and pending; contact an administrator.'), { status: 409 })
        throw failure
      }
    }
    if (error.code === 11000) throw Object.assign(new Error('This post already has a public listing. Publication was not duplicated.'), { status: 409 })
    throw error
  }
}

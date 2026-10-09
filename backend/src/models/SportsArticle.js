import mongoose from 'mongoose'
import { applicationUrlValidation, slugValidation, DATABASE_TIMEOUT_MS } from '../validation/listings.js'

const schema = new mongoose.Schema({
  assistantPostId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true, unique: true },
  publicationPending: { type: Boolean, default: false },
  status: { type: String, enum: ['published', 'archived'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 500 },
  slug: { type: String, required: true, unique: true, validate: slugValidation },
  summary: { type: String, trim: true, maxlength: 600, default: '' },
  sourceUrl: { type: String, required: true, validate: applicationUrlValidation },
  sourceName: { type: String, required: true, trim: true, maxlength: 500 },
  sourcePublishedAt: { type: Date, required: true },
  approvedAt: { type: Date, required: true },
  publishedAt: { type: Date, required: true },
}, { timestamps: true, bufferTimeoutMS: DATABASE_TIMEOUT_MS })
schema.index({ status: 1, publishedAt: -1 })
export default mongoose.model('SportsArticle', schema)

import mongoose from 'mongoose'
import { POST_TYPES, POST_FIELDS } from '../validation/ai-posts.js'
const fieldsSchema = new mongoose.Schema(Object.fromEntries(Object.entries(POST_FIELDS).map(([key, maxlength]) => [key, { type: String, default: '', maxlength }])), { _id: false })
const schema = new mongoose.Schema({
  postType: { type: String, enum: POST_TYPES, required: true },
  destination: { type: String, enum: ['', 'jobs', 'opportunities', 'scholarships'], default: '' },
  opportunityCategory: { type: String, default: '' },
  publicRecordId: mongoose.Schema.Types.ObjectId,
  publicSlug: String,
  publicationState: { type: String, enum: ['pending', 'complete'] },
  publicationRevision: Number,
  publicationStartedAt: Date,
  fields: { type: fieldsSchema, required: true },
  extractedFields: { type: fieldsSchema, required: true },
  evidence: { type: Map, of: String, default: {} },
  warnings: { type: [String], default: [] },
  sourceText: { type: String, default: '', maxlength: 20000 },
  imageText: { type: String, default: '', maxlength: 30000 },
  sourceImage: { name: String, mimeType: String, size: Number, sha256: String, data: { type: Buffer, select: false } },
  status: { type: String, enum: ['review', 'approved', 'published', 'archived'], default: 'review', required: true },
  revision: { type: Number, default: 0, min: 0 },
  deadlineDate: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: Date,
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  publishedAt: Date,
  expiresAt: Date,
  archivedAt: Date,
  aiModel: String,
}, { timestamps: true, bufferTimeoutMS: 5000 })
// Ordinary indexes only: expired posts and their source images must never be deleted by TTL.
schema.index({ status: 1, expiresAt: 1 })
schema.index({ createdAt: -1 })
export default mongoose.model('AssistantPost', schema)

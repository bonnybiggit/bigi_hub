import mongoose from 'mongoose'
import { applicationUrlValidation, slugValidation, DATABASE_TIMEOUT_MS } from '../validation/listings.js'

const supportedCountryCodes = ['NG', 'GH', 'KE', 'ZA', 'RW', 'SN']

const scholarshipSchema = new mongoose.Schema({
  assistantPostId: { type: mongoose.Schema.Types.ObjectId, immutable: true },
  publicationPending: { type: Boolean, default: false },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: slugValidation,
  },
  organization: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  countryCode: {
    type: String,
    required: true,
    uppercase: true,
    enum: supportedCountryCodes,
  },
  level: {
    type: String,
    trim: true,
  },
  eligibility: {
    type: String,
    trim: true,
  },
  funding: {
    type: String,
    trim: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  applyUrl: {
    type: String,
    trim: true,
    validate: applicationUrlValidation,
  },
  listedDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  bufferTimeoutMS: DATABASE_TIMEOUT_MS,
})

scholarshipSchema.index({ countryCode: 1, deadline: 1, listedDate: -1 })
scholarshipSchema.index({ title: 'text', organization: 'text', description: 'text' })

const Scholarship = mongoose.model('Scholarship', scholarshipSchema)

export default Scholarship

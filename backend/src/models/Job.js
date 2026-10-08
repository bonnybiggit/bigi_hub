import mongoose from 'mongoose'
import { applicationUrlValidation, slugValidation, DATABASE_TIMEOUT_MS } from '../validation/listings.js'

const supportedCountryCodes = ['NG', 'GH', 'KE', 'ZA', 'RW', 'SN']

const jobSchema = new mongoose.Schema({
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
  jobType: {
    type: String,
    required: true,
    trim: true,
  },
  workType: {
    type: String,
    enum: ['Remote', 'Hybrid', 'On-site'],
  },
  experienceLevel: {
    type: String,
    trim: true,
  },
  compensation: {
    type: String,
    trim: true,
  },
  requirements: {
    type: [String],
    default: [],
  },
  benefits: {
    type: [String],
    default: [],
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
  archivedAt: { type: Date, default: null },
}, {
  timestamps: true,
  bufferTimeoutMS: DATABASE_TIMEOUT_MS,
})

jobSchema.index({ countryCode: 1, deadline: 1, listedDate: -1 })
jobSchema.index({ title: 'text', organization: 'text', description: 'text' })

const Job = mongoose.model('Job', jobSchema)

export default Job

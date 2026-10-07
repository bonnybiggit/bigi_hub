import mongoose from 'mongoose'
import { applicationUrlValidation, slugValidation, DATABASE_TIMEOUT_MS } from '../validation/listings.js'

const supportedCountryCodes = ['NG', 'GH', 'KE', 'ZA', 'RW', 'SN']
const categories = [
  'Scholarships',
  'Grants',
  'Fellowships',
  'Internships',
  'Graduate Programs',
  'Training',
  'Competitions',
  'Volunteering',
]

const opportunitySchema = new mongoose.Schema({
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
  category: {
    type: String,
    required: true,
    enum: categories,
  },
  eligibility: {
    type: String,
    trim: true,
  },
  funding: {
    type: String,
    trim: true,
  },
  benefit: {
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

opportunitySchema.index({ countryCode: 1, category: 1, deadline: 1 })
opportunitySchema.index({ title: 'text', organization: 'text', description: 'text' })

const Opportunity = mongoose.model('Opportunity', opportunitySchema)

export default Opportunity

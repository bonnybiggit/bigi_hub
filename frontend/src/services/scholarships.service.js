import { getPublicListings, getPublicDetail } from './publicListings.js'

export const getScholarships = (params = {}, options = {}) => getPublicListings('scholarships', params, options)
export const getScholarshipBySlug = (slug, options = {}) => getPublicDetail('scholarships', slug, options)

import { getPublicListings, getPublicDetail } from './publicListings.js'

export const getJobs = (params = {}, options = {}) => getPublicListings('jobs', params, options)
export const getJobBySlug = (slug, options = {}) => getPublicDetail('jobs', slug, options)

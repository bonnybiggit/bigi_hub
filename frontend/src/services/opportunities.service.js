import { getPublicListings, getPublicDetail } from './publicListings.js'

export const getOpportunities = (params = {}, options = {}) => getPublicListings('opportunities', params, options)
export const getOpportunityBySlug = (slug, options = {}) => getPublicDetail('opportunities', slug, options)

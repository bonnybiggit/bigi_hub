import { getPublicListings, getPublicDetail } from './publicListings.js'
export const getSportsArticles = (params, options) => getPublicListings('sports', params, options)
export const getSportsArticleBySlug = (slug, options) => getPublicDetail('sports', slug, options)

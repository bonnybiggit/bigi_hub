import mongoose from 'mongoose'
import SportsArticle from './SportsArticle.js'
import { NEWS_CATEGORY_IDS } from '../config/content-categories.js'

// Reuse the attributed summary schema; Sports retains its existing collection.
const schema = SportsArticle.schema.clone()
schema.add({ category: { type: String, enum: [...NEWS_CATEGORY_IDS], required: true, immutable: true } })
schema.index({ category: 1, status: 1, publishedAt: -1 })
export default mongoose.model('NewsArticle', schema)

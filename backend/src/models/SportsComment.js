import mongoose from 'mongoose'

// One collection serves every commentable article category. `approved` is the stored value for
// publicly visible comments (kept for compatibility with existing data); new comments publish immediately.
// Legacy `pending` comments stay private until an admin restores them. Documents created before
// multi-category support have no `category` and are Sports comments.
const schema = new mongoose.Schema({
  articleId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  articleModel: { type: String, enum: ['SportsArticle', 'NewsArticle'], default: 'SportsArticle', immutable: true },
  category: { type: String, enum: ['sports', 'news', 'business', 'technology', 'health'], default: 'sports', immutable: true },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'approved', 'hidden'], default: 'approved', required: true },
}, { timestamps: true })
schema.index({ articleId: 1, status: 1, createdAt: -1 })
schema.index({ status: 1, createdAt: -1 })
schema.index({ category: 1, status: 1, createdAt: -1 })
export default mongoose.model('SportsComment', schema)

import { Router } from 'express'
import healthRouter from './health.routes.js'
import jobsRouter from './jobs.routes.js'
import opportunitiesRouter from './opportunities.routes.js'
import scholarshipsRouter from './scholarships.routes.js'
import sportsRouter, { createArticleRouter } from './sports.routes.js'
import NewsArticle from '../models/NewsArticle.js'
import authRouter from './auth.routes.js'
import adminJobsRouter from './admin-jobs.routes.js'
import { adminCommentsRouter } from './comments.routes.js'
import { PUBLIC_CATEGORIES } from '../config/content-categories.js'

const apiRouter = Router()
apiRouter.use('/admin/auth', authRouter)
apiRouter.use('/admin/jobs', adminJobsRouter)
apiRouter.use('/admin/comments', adminCommentsRouter)
apiRouter.use('/admin/sports-comments', adminCommentsRouter)

apiRouter.use('/health', healthRouter)
const publicRouters = { jobs: jobsRouter, opportunities: opportunitiesRouter, scholarships: scholarshipsRouter, sports: sportsRouter }
for (const category of PUBLIC_CATEGORIES) {
  const router = publicRouters[category.id] || (category.model === 'NewsArticle' ? createArticleRouter(NewsArticle, category.id) : null)
  if (!router) throw new Error(`Missing public API router for ${category.id}`)
  apiRouter.use(category.apiPath, router)
}

export default apiRouter

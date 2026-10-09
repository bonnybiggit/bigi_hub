import { Router } from 'express'
import healthRouter from './health.routes.js'
import jobsRouter from './jobs.routes.js'
import opportunitiesRouter from './opportunities.routes.js'
import scholarshipsRouter from './scholarships.routes.js'
import authRouter from './auth.routes.js'
import adminJobsRouter from './admin-jobs.routes.js'
import { PUBLIC_CATEGORIES } from '../config/content-categories.js'

const apiRouter = Router()
apiRouter.use('/admin/auth', authRouter)
apiRouter.use('/admin/jobs', adminJobsRouter)

apiRouter.use('/health', healthRouter)
const publicRouters = { jobs: jobsRouter, opportunities: opportunitiesRouter, scholarships: scholarshipsRouter }
for (const category of PUBLIC_CATEGORIES) {
  const router = publicRouters[category.id]
  if (!router) throw new Error(`Missing public API router for ${category.id}`)
  apiRouter.use(category.apiPath, router)
}

export default apiRouter

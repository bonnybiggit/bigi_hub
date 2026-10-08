import { Router } from 'express'
import healthRouter from './health.routes.js'
import jobsRouter from './jobs.routes.js'
import opportunitiesRouter from './opportunities.routes.js'
import scholarshipsRouter from './scholarships.routes.js'
import authRouter from './auth.routes.js'
import adminJobsRouter from './admin-jobs.routes.js'

const apiRouter = Router()
apiRouter.use('/admin/auth', authRouter)
apiRouter.use('/admin/jobs', adminJobsRouter)

apiRouter.use('/health', healthRouter)
apiRouter.use('/jobs', jobsRouter)
apiRouter.use('/opportunities', opportunitiesRouter)
apiRouter.use('/scholarships', scholarshipsRouter)

export default apiRouter

import { Router } from 'express'
import healthRouter from './health.routes.js'
import jobsRouter from './jobs.routes.js'
import opportunitiesRouter from './opportunities.routes.js'
import scholarshipsRouter from './scholarships.routes.js'

const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/jobs', jobsRouter)
apiRouter.use('/opportunities', opportunitiesRouter)
apiRouter.use('/scholarships', scholarshipsRouter)

export default apiRouter

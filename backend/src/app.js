import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import apiRouter from './routes/api.routes.js'

const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin: env.corsOrigins,
  credentials: true,
}))
app.use(express.json({ limit: '10kb' }))
app.use('/api', apiRouter)
app.use(notFoundHandler)
app.use(errorHandler)

export default app

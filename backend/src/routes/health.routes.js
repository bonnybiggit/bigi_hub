import { Router } from 'express'
import mongoose from 'mongoose'

const healthRouter = Router()

const databaseStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
}

healthRouter.get('/', (_request, response) => {
  const databaseStatus = databaseStates[mongoose.connection.readyState] ?? 'unknown'
  const isReady = databaseStatus === 'connected'

  response.status(isReady ? 200 : 503).json({
    status: isReady ? 'ok' : 'degraded',
    service: 'bigi-hub-api',
    database: databaseStatus,
    timestamp: new Date().toISOString(),
  })
})

export default healthRouter

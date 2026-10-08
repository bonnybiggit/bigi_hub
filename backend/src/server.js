import mongoose from 'mongoose'
import app from './app.js'
import { connectDatabase } from './config/database.js'
import { env } from './config/env.js'
import { provisionAdmin } from './auth/provision.js'
import { startPostExpiry } from './services/post-expiry.js'

const server = app.listen(env.port, () => {
  console.info(`Bigi_Hub API listening on port ${env.port}.`)
})

let isShuttingDown = false
let retryDelay = 1000
let retryTimer
let stopPostExpiry

async function connectWithRetry() {
  try {
    await connectDatabase()
    await provisionAdmin(env)
    if (!stopPostExpiry) stopPostExpiry = startPostExpiry()
    retryDelay = 1000
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`)
    if (!isShuttingDown) {
      retryTimer = setTimeout(connectWithRetry, retryDelay)
      retryTimer.unref()
      retryDelay = Math.min(retryDelay * 2, 30000)
    }
  }
}

connectWithRetry()

function shutdown(signal) {
  isShuttingDown = true
  clearTimeout(retryTimer)
  stopPostExpiry?.()
  console.info(`${signal} received; shutting down.`)
  server.close((error) => {
    if (error) {
      console.error('HTTP server shutdown failed:', error)
      process.exitCode = 1
    }

    mongoose.disconnect().catch((disconnectError) => {
      console.error('MongoDB disconnect failed:', disconnectError)
      process.exitCode = 1
    })
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

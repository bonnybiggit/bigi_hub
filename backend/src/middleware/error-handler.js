export function notFoundHandler(_request, response) {
  response.status(404).json({
    status: 'error',
    message: 'Route not found.',
  })
}

export function errorHandler(error, _request, response, _next) {
  console.error(error)

  const isDatabaseTimeout = error.code === 50 || [
    'MongoOperationTimeoutError', 'MongoNetworkTimeoutError', 'MongoServerSelectionError',
    'MongooseServerSelectionError',
  ].includes(error.name) || (error.name === 'MongooseError' && /buffering timed out/.test(error.message))
  const statusCode = isDatabaseTimeout ? 503
    : Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 500
  const isProduction = process.env.NODE_ENV?.trim().toLowerCase() === 'production'
  response.status(statusCode).json({
    status: 'error',
    message: isDatabaseTimeout ? 'Database request timed out. Please try again.'
      : isProduction ? (statusCode >= 500 ? 'Internal server error.' : 'Invalid request.')
        : error.message,
  })
}

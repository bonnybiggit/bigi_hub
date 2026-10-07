export function notFoundHandler(_request, response) {
  response.status(404).json({
    status: 'error',
    message: 'Route not found.',
  })
}

export function errorHandler(error, _request, response, _next) {
  console.error(error)

  const statusCode = Number.isInteger(error.status) ? error.status : 500
  response.status(statusCode).json({
    status: 'error',
    message: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : error.message,
  })
}

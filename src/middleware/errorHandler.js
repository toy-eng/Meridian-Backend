/**
 * Global error handling middleware.
 * Catches all errors thrown in route handlers and returns a consistent response.
 */
const errorHandler = (err, _req, res, _next) => {
  console.error('Error:', err);

  // Multer's file-size limit error — surface a friendly message with 413.
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File is too large. Maximum size is 200 KB.',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

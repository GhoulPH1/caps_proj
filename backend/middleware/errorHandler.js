export const errorHandler = (err, req, res, next) => {
    // Log the error
    console.error(`[${new Date().toISOString()}] Error:`, err);
  
    // Default error response
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      path: req.path
    };
  
    // Determine error type and appropriate response
    switch (err.name) {
      case 'ValidationError':
        errorResponse.message = 'Validation Failed';
        errorResponse.errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json(errorResponse);
  
      case 'MongoError':
      case 'MongoServerError':
        if (err.code === 11000) {
          errorResponse.message = 'Duplicate Key Error';
          errorResponse.duplicateField = Object.keys(err.keyPattern)[0];
          return res.status(409).json(errorResponse);
        }
        return res.status(500).json({
          ...errorResponse,
          message: 'Database Error'
        });
  
      case 'CastError':
        errorResponse.message = 'Invalid ID';
        return res.status(400).json(errorResponse);
  
      case 'UnauthorizedError':
      case 'JsonWebTokenError':
        return res.status(401).json({
          ...errorResponse,
          message: 'Unauthorized Access'
        });
  
      default:
        // For production, don't expose internal error details
        const statusCode = err.status || 500;
        return res.status(statusCode).json({
          status: 'error',
          message: process.env.NODE_ENV === 'development' 
            ? err.message 
            : 'Internal Server Error'
        });
    }
  };
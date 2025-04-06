// utils/error-handler.js

export class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export const handleError = (res, error) => {
    // Application errors (errors we created)
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        msg: error.message
      });
    }
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        success: false, 
        msg: messages.join(', ')
      });
    }
    
    // Mongoose duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ 
        success: false, 
        msg: `${field} already exists`
      });
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        msg: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        msg: 'Token has expired'
      });
    }
    
    // Default server error
    console.error('Unhandled error:', error);
    return res.status(500).json({
      success: false,
      msg: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  };
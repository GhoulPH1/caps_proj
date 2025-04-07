// auth.middleware.js - Updated version
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import AuthService from '../services/auth.service.js';

export const validateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        msg: 'No valid token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify access token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user by ID
      const user = await User.findById(decoded.userId)
        .select('-password -pin -securityAnswer');
        
      if (!user) {
        return res.status(401).json({
          success: false,
          msg: 'User not found'
        });
      }
      
      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      // If token is expired, try to refresh using refresh token
      if (error.name === 'TokenExpiredError') {
        // Get refresh token from cookie (or another secure method)
        const refreshToken = req.cookies?.refreshToken;
        
        if (!refreshToken) {
          return res.status(401).json({
            success: false,
            msg: 'Access token expired and no refresh token available'
          });
        }
        
        try {
          // Try to get a new access token
          const tokens = await AuthService.refreshAccessToken(refreshToken);
          
          // Find user
          const decoded = jwt.decode(tokens.accessToken);
          const user = await User.findById(decoded.userId)
            .select('-password -pin -securityAnswer');
            
          if (!user) {
            return res.status(401).json({
              success: false,
              msg: 'User not found'
            });
          }
          
          // Add user to request object
          req.user = user;
          
          // Send new tokens to client
          res.set('X-New-Access-Token', tokens.accessToken);
          
          // If refresh token was also refreshed, update the cookie
          if (tokens.refreshed) {
            res.cookie('refreshToken', tokens.refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
          }
          
          next();
        } catch (refreshError) {
          return res.status(401).json({
            success: false,
            msg: 'Failed to refresh token'
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          msg: 'Invalid token'
        });
      }
    }
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error during authentication'
    });
  }
};

// This middleware runs on every API request to refresh tokens when they are about to expire
export const preemptiveTokenRefresh = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    // Decode without verification to check expiry
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.exp) {
      return next();
    }
    
    // If token is valid but about to expire (less than 5 minutes left)
    const tokenExpiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (tokenExpiresIn > 0 && tokenExpiresIn < 300) { // 5 minutes in seconds
      const refreshToken = req.cookies?.refreshToken;
      
      if (refreshToken) {
        try {
          // Get new tokens
          const tokens = await AuthService.refreshAccessToken(refreshToken);
          
          // Send new tokens to client
          res.set('X-New-Access-Token', tokens.accessToken);
          
          // If refresh token was also refreshed, update the cookie
          if (tokens.refreshed) {
            res.cookie('refreshToken', tokens.refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
          }
        } catch (error) {
          // Continue even if refresh fails
          console.warn('Preemptive token refresh failed:', error.message);
        }
      }
    }
    
    next();
  } catch (error) {
    // Don't block the request if this middleware fails
    console.error('Error in preemptive token refresh:', error);
    next();
  }
};
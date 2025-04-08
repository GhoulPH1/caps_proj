import User from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Configuration constants
export const AUTH_CONFIG = {
  ATTEMPT_LIMIT: 3,
  COOLDOWN_TIME: 60 * 1000, // 60 seconds (matching the PIN controller)
  MAX_COOLDOWNS: 2,
  JWT_EXPIRATION: '1h'
};

export default class AuthService {
  static generateToken(userId) {
    return jwt.sign(
      { userId }, 
      process.env.JWT_SECRET, 
      { 
        expiresIn: AUTH_CONFIG.JWT_EXPIRATION,
        algorithm: 'HS256'
      }
    );
  }

  static sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    const { password, pin, securityAnswer, ...sanitizedUser } = userObj;
    return sanitizedUser;
  }

  static async registerUser(userData) {
    const requiredFields = [
      'name', 'email', 'password', 'age', 
      'birthday', 'sexualOrientation', 
      'pin', 'securityPhrase', 'securityAnswer'
    ];
    
    const missingFields = requiredFields.filter(field => !userData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Please include all required fields: ${missingFields.join(', ')}`);
    }

    const newUser = new User(userData);
    await newUser.save();
    
    return this.sanitizeUser(newUser);
  }

  static async authenticateUser(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid email or password');
    }

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user._id)
    };
  }

  static async validatePin(userId, pin) {
    if (!userId || !pin) {
      throw new Error('User ID and PIN are required');
    }

    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is currently locked out
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      const remainingSeconds = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
      throw new Error(`Too many incorrect attempts. Try again in ${remainingSeconds} seconds.`);
    }

    // Use the comparePin method from the user model
    const isMatch = await user.comparePin(pin);
    
    if (!isMatch) {
      user.pinAttempts = (user.pinAttempts || 0) + 1;

      if (user.pinAttempts >= AUTH_CONFIG.ATTEMPT_LIMIT) {
        user.pinAttempts = 0;
        user.cooldowns = (user.cooldowns || 0) + 1;
        user.lockoutUntil = new Date(Date.now() + AUTH_CONFIG.COOLDOWN_TIME);
        await user.save();
        throw new Error(`Too many incorrect attempts. Try again in ${AUTH_CONFIG.COOLDOWN_TIME / 1000} seconds.`);
      }

      await user.save();
      throw new Error('Invalid PIN');
    }

    // If user exceeded max cooldowns, enforce security question verification
    if (user.cooldowns >= AUTH_CONFIG.MAX_COOLDOWNS) {
      return {
        requireSecurityQuestion: true
      };
    }

    // Reset attempt counters on successful PIN verification
    user.pinAttempts = 0;
    user.cooldowns = 0;
    user.lockoutUntil = null;
    await user.save();

    return { verified: true };
  }

  static async verifySecurityQuestion(userId, securityAnswer) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!securityAnswer) {
      throw new Error('Security answer is required');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify security answer
    const isMatch = await user.compareSecurityAnswer(securityAnswer);
    if (!isMatch) {
      throw new Error('Incorrect security answer');
    }

    // Reset cooldown if security question is answered correctly
    user.cooldowns = 0;
    await user.save();

    return { canProceed: true };
  }

  static async updateUserCredentials(userId, updates) {
    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Validate and process updates
    const updateValidations = {
      password: async (value) => {
        if (await bcrypt.compare(value, existingUser.password)) {
          throw new Error("New password cannot be the same as the current password");
        }
        return value;
      },
      pin: async (value) => {
        if (!/^\d{4}$/.test(value)) {
          throw new Error("PIN must be exactly 4 digits");
        }
        if (existingUser.pin && await bcrypt.compare(value, existingUser.pin)) {
          throw new Error("New PIN cannot be the same as the current PIN");
        }
        return value;
      },
      securityPhrase: (value) => {
        if (value.trim().length < 10) {
          throw new Error("Security phrase must be at least 10 characters long");
        }
        return value;
      },
      securityAnswer: (value) => {
        if (!value || value.trim().length === 0) {
          throw new Error("Security answer cannot be empty");
        }
        return value;
      }
    };

    // Validate and process each update
    for (const [key, value] of Object.entries(updates)) {
      if (updateValidations[key]) {
        updates[key] = await updateValidations[key](value);
      }
    }

    // Update the user in the database
    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,          // Return the updated document
      runValidators: true // Ensure schema validators run
    });

    return this.sanitizeUser(updatedUser);
  }

  static async resetPin(userId, newPin, securityAnswer) {
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      throw new Error('New PIN must be exactly 4 digits');
    }
    
    if (!securityAnswer) {
      throw new Error('Security answer is required');
    }
    
    // First verify security answer
    const securityResult = await this.verifySecurityQuestion(userId, securityAnswer);
    
    if (!securityResult.canProceed) {
      throw new Error('Invalid security answer');
    }
    
    // Update the PIN
    await this.updateUserCredentials(userId, { pin: newPin });
    
    // Reset lockout status
    await User.findByIdAndUpdate(userId, {
      pinAttempts: 0,
      cooldowns: 0,
      lockoutUntil: null
    });
    
    return { success: true };
  }

  static async getPinStatus(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if account is locked
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      // Calculate remaining cooldown time
      const remainingSeconds = Math.ceil((user.lockoutUntil - new Date()) / 1000);
      return {
        isLocked: true,
        cooldownTime: remainingSeconds,
        attemptsLeft: 0,
        requiresSecurityQuestion: user.cooldowns >= AUTH_CONFIG.MAX_COOLDOWNS
      };
    }
    
    // Return current status
    return {
      isLocked: false,
      attemptsLeft: AUTH_CONFIG.ATTEMPT_LIMIT - (user.pinAttempts || 0),
      cooldownTime: null,
      requiresSecurityQuestion: user.cooldowns >= AUTH_CONFIG.MAX_COOLDOWNS
    };
  }

  static async loginUser(email, password, pin) {
    // Comprehensive input validation
    if (!email || !password || !pin) {
      throw new Error('Email, password, and PIN are required');
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Comprehensive credential validation
    if (!user || 
        !(await user.comparePassword(password)) || 
        !(await user.comparePin(pin))) {
      throw new Error('Invalid credentials');
    }
    
    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user._id)
    };
  }
  
  static async generateTokens(user) {
    // Check if user is a valid object
    if (!user || !user._id) {
      throw new Error('Invalid user object provided');
    }
  
    const payload = { userId: user._id, role: user.role };
  
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );
  
    const refreshToken = jwt.sign(
      payload,
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );
  
    // Check if user is a mongoose document with save method
    if (user.save && typeof user.save === 'function') {
      user.refreshToken = refreshToken;
      user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save();
    } else {
      // If not a mongoose document, update it directly in the database
      await User.findByIdAndUpdate(user._id, {
        refreshToken: refreshToken,
        refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }
    
    return { accessToken, refreshToken };
  }

  static async refreshAccessToken(refreshToken) {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken,
      refreshTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid refresh token');
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );

    const refreshTokenNearingExpiry = user.refreshTokenExpiry < new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (refreshTokenNearingExpiry) {
      const tokens = await this.generateTokens(user);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshed: true
      };
    }

    return {
      accessToken,
      refreshToken,
      refreshed: false
    };
  }

  static async invalidateRefreshToken(userId) {
    await User.findByIdAndUpdate(userId, {
      $unset: { refreshToken: "", refreshTokenExpiry: "" }
    });
  }
}
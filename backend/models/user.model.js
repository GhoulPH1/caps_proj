  import mongoose from 'mongoose';
  import bcrypt from 'bcrypt';

  const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  const MAX_LOGIN_ATTEMPTS = 5;

  const userSchema = new mongoose.Schema({
    name: { 
      type: String, 
      required: [true, 'Name is required'],
      trim: true
    },
    age: { 
      type: Number, 
      required: [true, 'Age is required'],
      min: [0, 'Age must be a positive number']
    }, 
    email: { 
      type: String, 
      required: [true, 'Email is required'], 
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    }, 
    password: { 
      type: String, 
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: function(v) {
          return /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(v);
        },
        message: 'Password must have at least 8 characters, one uppercase letter, one number, and one special character.'
      }
    },
    passwordHistory: {
      type: [
        {
          hash: { type: String, required: true },
          usedAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    pin: {
      type: String,
      index: true,
      required: [true, 'Authentication PIN is required']
    },
    securityPhrase: {
      type: String,
      required: [true, 'Security phrase/question is required']
    },
    securityAnswer: {
      type: String,
      required: [true, 'Security answer is required']
    },
    birthday: {
      type: Date,
      required: [true, 'Birthday is required']
    },
    sexualOrientation: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer not to say'],
      required: [true, 'Sexual orientation is required']
    },
    refreshToken: {
      type: String,
      default: null
    },
    refreshTokenExpiry: {
      type: Date,
      default: null
    },
    pinAttempts: {
      type: Number,
      default: 0
    },
    cooldowns: {
      type: Number,
      default: 0
    },
    lockoutUntil: {
      type: Date,
      default: null
    },
    loginAttempts: {
      type: Number,
      default: 0
    }, 
    lastLogin: {
      type: Date,
      default: null
    },
  }, {
    timestamps: true
  });

  // 🔄 Pre-save hook for hashing password, PIN, and security answer
  userSchema.pre('save', async function(next) {
    try {
      // Hash password
      if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(this.password, salt);
        
        // Store current password hash before replacing
        if (!this.passwordHistory) this.passwordHistory = [];
        this.passwordHistory.unshift({ hash: this.password, usedAt: new Date() });
        this.passwordHistory = this.passwordHistory.slice(0, 5);
      
        this.password = newHash;
      }      

      // Hash PIN (if modified)
      if (this.isModified('pin')) {
        if (!/^\d{4}$/.test(this.pin)) {
          return next(new Error('PIN must be exactly 4 digits'));
        }
        const salt = await bcrypt.genSalt(10);
        this.pin = await bcrypt.hash(this.pin, salt);
      }

      // Hash security answer (if modified)
      if (this.isModified('securityAnswer')) {
        const salt = await bcrypt.genSalt(10);
        this.securityAnswer = await bcrypt.hash(this.securityAnswer.toUpperCase(), salt);
      }

      next();
    } catch (error) {
      next(error);
    }
  });

  // 🔑 Prevent password reuse
  userSchema.methods.isPasswordUnique = async function(password) {
    for (let entry of this.passwordHistory) {
      const isMatch = await bcrypt.compare(password, entry.hash);
      if (isMatch) return false;
    }
    return true;
  };

  // 🔓 Login attempt tracking with auto-unlock
  userSchema.methods.incrementLoginAttempts = async function() {
    if (this.lockoutUntil && this.lockoutUntil > Date.now()) {
      return false; // Still locked out
    }

    this.loginAttempts += 1;
    
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      this.lockoutUntil = Date.now() + LOCKOUT_DURATION;
    }

    await this.save();
    return true;
  };

  userSchema.methods.resetLoginAttempts = async function() {
    this.loginAttempts = 0;
    this.lockoutUntil = null;
    await this.save();
  };

  // 🔐 Compare password, PIN, and security answer
  userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  userSchema.methods.comparePin = function(candidatePin) {
    return /^\d{4}$/.test(candidatePin) ? bcrypt.compare(candidatePin, this.pin) : false;
  };

  userSchema.methods.compareSecurityAnswer = function(candidateAnswer) {
    return bcrypt.compare(candidateAnswer.toUpperCase(), this.securityAnswer);
  };

  // 🛡 Sanitize user object before returning it (prevents leaking sensitive info)
  userSchema.methods.sanitizeUser = function() {
    const userObj = this.toObject();
    delete userObj.password;
    delete userObj.pin;
    delete userObj.securityAnswer;
    delete userObj.passwordHistory;
    return userObj;
  };

  const User = mongoose.model('User', userSchema);

  export default User;
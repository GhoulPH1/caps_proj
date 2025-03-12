import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

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
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  }, 
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  pin: {
    type: String,
    required: [true, 'Authentication PIN is required'],
    validate: {
      validator: function(v) {
        return /^\d{4}$/.test(v);
      },
      message: props => `${props.value} is not a valid PIN. PIN must be exactly 4 digits.`
    }
  },
  birthday: {
    type: Date,
    required: [true, 'Birthday is required']
  },
  sexualOrientation: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer not to say'],
    required: [true, 'Sexual orientation is required']
  }
}, {
  timestamps: true
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save hook to hash PIN
userSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to compare PINs
userSchema.methods.comparePin = async function(candidatePin) {
  return await bcrypt.compare(candidatePin, this.pin);
};

const User = mongoose.model('User', userSchema);

export default User;
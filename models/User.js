const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    profile: {
      skills: { type: [String], default: [] },
      bio: { type: String, default: '', maxlength: [1000, 'Bio cannot exceed 1000 characters'] },
      experience: { type: String, default: '', maxlength: [2000, 'Experience cannot exceed 2000 characters'] },
    },
    credits: {
      type: Number,
      default: 0,
      min: [0, 'Credits cannot be negative'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
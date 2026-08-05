import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
      default: null, // null for cross-tenant Super Admin
    },
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'User email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT'],
      default: 'COMPANY_ADMIN',
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isGoogleAuth: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      default: null,
    },
    isFacebookAuth: {
      type: Boolean,
      default: false,
    },
    facebookId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);

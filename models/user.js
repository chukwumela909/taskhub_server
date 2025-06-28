const { Schema, model } = require('mongoose');

const userSchema = new Schema({ 
    fullName: { type: String, required: true, },
    emailAddress: {type: String, required: true, unique: true},
    phoneNumber: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    profilePicture: { type: String, default: '' },
    country: { type: String, required: true },
    originState: { type: String, },
    residentState: { type: String, required: true },
    area: { type: String,  },
    address: { type: String, required: true },
    password: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 0 },
    
    // Admin role
    isAdmin: { type: Boolean, default: false },
    
    // New authentication fields
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const User = model('User', userSchema);

module.exports = User;
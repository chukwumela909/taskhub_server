const User = require('../models/user')
const Tasker = require('../models/tasker')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
    generateToken,
    generateRandomToken,
    generatePasswordResetCode,
    hashToken,
    sendVerificationEmail,
    sendPasswordResetEmail,
    MAX_LOGIN_ATTEMPTS,
    LOCK_TIME,
    JWT_SECRET
} = require('../utils/authUtils');

// Helper function to handle login attempts and account locking
const handleLoginAttempt = async (user, isValidPassword) => {
    // If password is correct and account is not locked
    if (isValidPassword && !user.isLocked) {
        // Reset login attempts if there were any
        if (user.loginAttempts > 0) {
            await user.updateOne({
                $unset: { loginAttempts: 1, lockUntil: 1 }
            });
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        return { success: true };
    }
    
    // If account is locked
    if (user.isLocked) {
        return { 
            success: false, 
            message: 'Account temporarily locked due to too many failed login attempts. Try again later.' 
        };
    }
    
    // If password is incorrect
    if (!isValidPassword) {
        user.loginAttempts += 1;
        
        // Lock account if max attempts reached
        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            user.lockUntil = Date.now() + LOCK_TIME;
        }
        
        await user.save();
        
        const attemptsLeft = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
        if (attemptsLeft > 0) {
            return { 
                success: false, 
                message: `Invalid credentials. ${attemptsLeft} attempts remaining.` 
            };
        } else {
            return { 
                success: false, 
                message: 'Account temporarily locked due to too many failed login attempts.' 
            };
        }
    }
};

//User registration

const userRegister = async (req, res) => {
    const { fullName, emailAddress, phoneNumber, country, residentState, address, password,  dateOfBirth } = req.body;
    
    console.log(req.body);
    // Check for required fields
    const requiredFields = {
        fullName, emailAddress, phoneNumber, country, residentState, 
        address, password, dateOfBirth
    };
    
    const missingFields = [];
    for (const [field, value] of Object.entries(requiredFields)) {
        if (!value) {
            missingFields.push(field);
        }
    }
    
    if (missingFields.length > 0) {
        return res.status(400).json({
            status: "error",
            message: "Missing required fields",
            missingFields: missingFields
        });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await User.findOne({ emailAddress });
        if (existingUser) {
            return res.status(400).json({status: "error", message: 'Email is already in use' });
        }

        const existingPhoneNumber = await User.findOne({ phoneNumber: phoneNumber });
        if (existingPhoneNumber) {
            return res.status(400).json({status: "error", message: 'Phone number is already in use' });
        }

        // Generate email verification token
        const emailToken = generateRandomToken();

        console.log(emailToken);



        const user = new User({ 
            fullName, 
            emailAddress, 
            phoneNumber, 
            country, 
            residentState, 
            address,  
            password: hashedPassword, 
            wallet: 0,         
            dateOfBirth,
            emailVerificationToken: hashToken(emailToken),
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });
        await user.save();
        // Send verification email (optional - can be disabled for development)
        try {
            console.log(emailAddress, emailToken, 'user');
            await sendVerificationEmail(emailAddress, emailToken, 'user');
        } catch (emailError) {
            console.log('Email sending failed:', emailError.message);
            // Continue with registration even if email fails
        }

        res.status(201).json({
            status: "success", 
            message: 'User registered successfully. Please check your email to verify your account.',
            emailVerificationRequired: true,
            emailToken: emailToken
        });
    } catch (error) {
        res.status(500).json({status: "error", message: 'Error registering user', error: error.message});
    }
};

const userLogin = async (req, res) => {
    const { emailAddress, password } = req.body;
    
    if (!emailAddress || !password) {
        return res.status(400).json({
            status: "error", 
            message: 'Email and password are required'
        });
    }
    
    try {
        const user = await User.findOne({ emailAddress });
        if (!user) {
            return res.status(400).json({status: "error", message: 'Invalid credentials' });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(400).json({
                status: "error", 
                message: 'Account has been deactivated. Please contact support.'
            });
        }

        const isValid = await bcrypt.compare(password, user.password);
        const loginResult = await handleLoginAttempt(user, isValid);
        
        if (!loginResult.success) {
            return res.status(400).json({
                status: "error", 
                message: loginResult.message
            });
        }

        // Generate token
        const token = generateToken(user._id);

        return res.status(200).json({
            status: "success", 
            token,
            user_type: 'user',
            isEmailVerified: user.isEmailVerified,
            expiresIn: 'never'
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error",
            message: 'Error logging in', 
            error: error.message 
        });
    }
};

const getUser =  async (req, res) => {
    try {
        // Remove sensitive information before sending
        const userInfo = {
            _id: req.user._id,
            fullName: req.user.fullName,
            emailAddress: req.user.emailAddress,
            phoneNumber: req.user.phoneNumber,
            dateOfBirth: req.user.dateOfBirth,
            profilePicture: req.user.profilePicture,
            country: req.user.country,
            residentState: req.user.residentState,
            address: req.user.address,
            wallet: req.user.wallet,
            isEmailVerified: req.user.isEmailVerified,
            lastLogin: req.user.lastLogin,
            createdAt: req.user.createdAt
        };
        
        return res.status(200).json({
            status: "success", 
            message: 'User fetched successfully', 
            user: userInfo 
        });
    } catch (error) {
        res.status(500).json({status: "error",  message: error.message });
    }
};

// Tasker registration

const taskerRegister = async (req, res) => {
    const { firstName, lastName, emailAddress, phoneNumber, country, residentState, originState, address, password, dateOfBirth } = req.body;
    
    // Check for required fields
    const requiredFields = {
        firstName, lastName, emailAddress, phoneNumber, country, 
        residentState, originState, address, password, dateOfBirth
    };
    
    const missingFields = [];
    for (const [field, value] of Object.entries(requiredFields)) {
        if (!value) {
            missingFields.push(field);
        }
    }
    
    if (missingFields.length > 0) {
        return res.status(400).json({
            status: "error",
            message: "Missing required fields",
            missingFields: missingFields
        });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await Tasker.findOne({ emailAddress });
        if (existingUser) {
            return res.status(400).json({status: "error", message: 'Email is already in use' });
        }

        const existingPhoneNumber = await Tasker.findOne({ phoneNumber: phoneNumber });
        if (existingPhoneNumber) {
            return res.status(400).json({status: "error", message: 'Phone number is already in use' });
        }

        // Generate email verification token
        const emailToken = generateRandomToken();
        const hashedEmailToken = hashToken(emailToken);

        const tasker = new Tasker({ 
            firstName, 
            lastName, 
            emailAddress, 
            phoneNumber, 
            dateOfBirth,
            country, 
            originState, 
            residentState, 
            address,  
            password: hashedPassword, 
            wallet: 0,
            emailVerificationToken: hashedEmailToken,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });
        await tasker.save();

        // Send verification email (optional - can be disabled for development)
        try {
            await sendVerificationEmail(emailAddress, emailToken, 'tasker');
        } catch (emailError) {
            console.log('Email sending failed:', emailError.message);
            // Continue with registration even if email fails
        }

        res.status(201).json({
            status: "success", 
            message: 'Tasker registered successfully. Please check your email to verify your account.',
            emailVerificationRequired: true
        });
    } catch (error) {
        res.status(500).json({status: "error", message: 'Error registering tasker', error: error.message});
    }
};

const taskerLogin = async (req, res) => {
    const { emailAddress, password } = req.body;
    
    if (!emailAddress || !password) {
        return res.status(400).json({
            status: "error", 
            message: 'Email and password are required'
        });
    }
    
    try {
        const tasker = await Tasker.findOne({ emailAddress });
        if (!tasker) {
            return res.status(400).json({status: "error", message: 'Invalid credentials' });
        }

        // Check if account is active
        if (!tasker.isActive) {
            return res.status(400).json({
                status: "error", 
                message: 'Account has been deactivated. Please contact support.'
            });
        }

        const isValid = await bcrypt.compare(password, tasker.password);
        const loginResult = await handleLoginAttempt(tasker, isValid);
        
        if (!loginResult.success) {
            return res.status(400).json({
                status: "error", 
                message: loginResult.message
            });
        }

        // Generate token
        const token = generateToken(tasker._id);

        return res.status(200).json({
            status: "success", 
            token,
            user_type: 'tasker',
            isEmailVerified: tasker.isEmailVerified,
            expiresIn: 'never'
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error",
            message: 'Error logging in', 
            error: error.message 
        });
    }
};

const getTasker = async (req, res) => {
    try {
        // Get tasker with populated categories
        const tasker = await Tasker.findById(req.tasker._id)
            .populate('categories', 'name displayName description isActive')
            .select('-password -emailVerificationToken -passwordResetToken -loginAttempts -lockUntil');
        
        if (!tasker) {
            return res.status(404).json({
                status: "error",
                message: "Tasker not found"
            });
        }
        
        // Remove sensitive information before sending
        const taskerInfo = {
            _id: tasker._id,
            firstName: tasker.firstName,
            lastName: tasker.lastName,
            emailAddress: tasker.emailAddress,
            phoneNumber: tasker.phoneNumber,
            dateOfBirth: tasker.dateOfBirth,
            profilePicture: tasker.profilePicture,
            country: tasker.country,
            originState: tasker.originState,
            residentState: tasker.residentState,
            address: tasker.address,
            wallet: tasker.wallet,
            location: tasker.location,
            categories: tasker.categories,
            isEmailVerified: tasker.isEmailVerified,
            verifyIdentity: tasker.verifyIdentity,
            lastLogin: tasker.lastLogin,
            createdAt: tasker.createdAt
        };
        
        return res.status(200).json({
            status: "success", 
            message: 'Tasker fetched successfully', 
            user: taskerInfo 
        });
    } catch (error) {
        res.status(500).json({status: "error", message: error.message });
    }
};

// NEW AUTHENTICATION FEATURES

// Email Verification
const verifyEmail = async (req, res) => {
    const { code, emailAddress, type } = req.body;
    
    if (!code || !emailAddress || !type) {
        return res.status(400).json({
            status: "error",
            message: 'Verification code, email address, and type are required'
        });
    }
    
    try {
        const hashedCode = hashToken(code);
        const Model = type === 'user' ? User : Tasker;
        
        const user = await Model.findOne({
            emailAddress,
            emailVerificationToken: hashedCode,
            emailVerificationExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                status: "error",
                message: 'Invalid or expired verification code'
            });
        }
        
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        
        res.status(200).json({
            status: "success",
            message: 'Email verified successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error verifying email',
            error: error.message
        });
    }
};

// Resend Email Verification
const resendEmailVerification = async (req, res) => {
    const { emailAddress, type } = req.body;
    
    if (!emailAddress || !type) {
        return res.status(400).json({
            status: "error",
            message: 'Email address and type are required'
        });
    }
    
    try {
        const Model = type === 'user' ? User : Tasker;
        const user = await Model.findOne({ emailAddress });
        
        if (!user) {
            return res.status(400).json({
                status: "error",
                message: 'User not found'
            });
        }
        
        if (user.isEmailVerified) {
            return res.status(400).json({
                status: "error",
                message: 'Email is already verified'
            });
        }
        
        const emailCode = generateRandomToken();
        const hashedEmailCode = hashToken(emailCode);
        
        user.emailVerificationToken = hashedEmailCode;
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        await user.save();
        
        await sendVerificationEmail(emailAddress, emailCode, type);
        
        res.status(200).json({
            status: "success",
            message: 'Verification code sent successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error sending verification code',
            error: error.message
        });
    }
};

// Forgot Password
const forgotPassword = async (req, res) => {
    const { emailAddress, type } = req.body;
    
    if (!emailAddress || !type) {
        return res.status(400).json({
            status: "error",
            message: 'Email address and type are required'
        });
    }
    
    try {
        const Model = type === 'user' ? User : Tasker;
        const user = await Model.findOne({ emailAddress });
        
        if (!user) {
            // Don't reveal whether user exists or not for security
            return res.status(200).json({
                status: "success",
                message: 'If the email exists, a password reset link has been sent'
            });
        }
        
        const resetCode = generatePasswordResetCode();
        const hashedResetCode = hashToken(resetCode);
        
        user.passwordResetToken = hashedResetCode;
        user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();
        
        await sendPasswordResetEmail(emailAddress, resetCode, type);
        
        res.status(200).json({
            status: "success",
            message: 'If the email exists, a password reset code has been sent'
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error processing password reset request',
            error: error.message
        });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    const { code, newPassword, type, emailAddress } = req.body;
    
    if (!code || !newPassword || !type || !emailAddress) {
        return res.status(400).json({
            status: "error",
            message: 'Reset code, new password, email address, and type are required'
        });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({
            status: "error",
            message: 'Password must be at least 6 characters long'
        });
    }
    
    try {
        const hashedCode = hashToken(code);
        const Model = type === 'user' ? User : Tasker;
        
        const user = await Model.findOne({
            emailAddress: emailAddress,
            passwordResetToken: hashedCode,
            passwordResetExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                status: "error",
                message: 'Invalid or expired reset code, or email address does not match'
            });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        // Reset login attempts on password reset
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
        
        res.status(200).json({
            status: "success",
            message: 'Password reset successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error resetting password',
            error: error.message
        });
    }
};

// Change Password (for authenticated users)
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            status: "error",
            message: 'Current password and new password are required'
        });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({
            status: "error",
            message: 'New password must be at least 6 characters long'
        });
    }
    
    try {
        const isValidPassword = await bcrypt.compare(currentPassword, req.user.password);
        
        if (!isValidPassword) {
            return res.status(400).json({
                status: "error",
                message: 'Current password is incorrect'
            });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        req.user.password = hashedPassword;
        await req.user.save();
        
        res.status(200).json({
            status: "success",
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error changing password',
            error: error.message
        });
    }
};

// Update Profile
const updateProfile = async (req, res) => {
    try {
        const allowedUpdates = ['fullName', 'firstName', 'lastName', 'phoneNumber', 'country', 'residentState', 'address', 'profilePicture'];
        const updates = {};
        
        // Add categories field for taskers only
        if (req.user.firstName) { // Taskers have firstName field
            allowedUpdates.push('categories');
        }
        
        // Only include allowed fields that are present in the request
        for (const field of allowedUpdates) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }
        
        // Validate categories if provided
        if (updates.categories) {
            if (!Array.isArray(updates.categories)) {
                return res.status(400).json({
                    status: "error",
                    message: 'Categories must be an array of strings'
                });
            }
            
            // Remove empty strings and duplicates
            updates.categories = [...new Set(updates.categories.filter(cat => cat && typeof cat === 'string' && cat.trim()))];
        }
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                status: "error",
                message: 'No valid fields to update'
            });
        }
        
        // Check if phone number is being updated and is unique
        if (updates.phoneNumber && updates.phoneNumber !== req.user.phoneNumber) {
            const Model = req.user.firstName ? Tasker : User; // Determine model type
            const existingUser = await Model.findOne({ phoneNumber: updates.phoneNumber });
            if (existingUser) {
                return res.status(400).json({
                    status: "error",
                    message: 'Phone number is already in use'
                });
            }
        }
        
        Object.assign(req.user, updates);
        await req.user.save();
        
        res.status(200).json({
            status: "success",
            message: 'Profile updated successfully',
            user: req.user
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error updating profile',
            error: error.message
        });
    }
};

// Logout
const logout = async (req, res) => {
    try {
        res.status(200).json({
            status: "success",
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error logging out',
            error: error.message
        });
    }
};

// Update Profile Picture
const updateProfilePicture = async (req, res) => {
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
        return res.status(400).json({
            status: "error",
            message: 'Profile picture URL is required'
        });
    }
    
    // Basic URL validation
    try {
        new URL(profilePicture);
    } catch (error) {
        return res.status(400).json({
            status: "error",
            message: 'Invalid profile picture URL format'
        });
    }
    
    try {
        req.user.profilePicture = profilePicture;
        await req.user.save();
        
        res.status(200).json({
            status: "success",
            message: 'Profile picture updated successfully',
            profilePicture: req.user.profilePicture
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error updating profile picture',
            error: error.message
        });
    }
};

// Update Tasker Categories
const updateTaskerCategories = async (req, res) => {
    const { categories } = req.body;
    
    // Check if user is a tasker
    if (!req.tasker.firstName) {
        return res.status(403).json({
            status: "error",
            message: 'This endpoint is only available for taskers'
        });
    }
    
    if (!categories) {
        return res.status(400).json({
            status: "error",
            message: 'Categories array is required'
        });
    }
    
    if (!Array.isArray(categories)) {
        return res.status(400).json({
            status: "error",
            message: 'Categories must be an array of category IDs'
        });
    }
    
    try {
        const mongoose = require('mongoose');
        const Category = require('../models/category');
        
        // Validate category IDs
        const categoryIds = categories.filter(id => id && mongoose.Types.ObjectId.isValid(id));
        
        if (categoryIds.length !== categories.length) {
            return res.status(400).json({
                status: "error",
                message: 'All categories must be valid ObjectId strings'
            });
        }
        
        // Remove duplicates
        const uniqueCategoryIds = [...new Set(categoryIds)];
        
        if (uniqueCategoryIds.length === 0) {
            return res.status(400).json({
                status: "error",
                message: 'At least one valid category is required'
            });
        }
        
        // Verify all categories exist and are active
        const existingCategories = await Category.find({
            _id: { $in: uniqueCategoryIds },
            isActive: true
        });
        
        if (existingCategories.length !== uniqueCategoryIds.length) {
            const foundIds = existingCategories.map(cat => cat._id.toString());
            const missingIds = uniqueCategoryIds.filter(id => !foundIds.includes(id));
            
            return res.status(400).json({
                status: "error",
                message: 'Some categories are invalid or inactive',
                invalidCategories: missingIds
            });
        }
        
        req.tasker.categories = uniqueCategoryIds;
        await req.tasker.save();
        
        // Populate categories for response
        await req.tasker.populate('categories', 'name displayName description');
        
        res.status(200).json({
            status: "success",
            message: 'Categories updated successfully',
            categories: req.tasker.categories
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error updating categories',
            error: error.message
        });
    }
};

// Deactivate Account
const deactivateAccount = async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({
            status: "error",
            message: 'Password is required to deactivate account'
        });
    }
    
    try {
        const isValidPassword = await bcrypt.compare(password, req.user.password);
        
        if (!isValidPassword) {
            return res.status(400).json({
                status: "error",
                message: 'Incorrect password'
            });
        }
        
        req.user.isActive = false;
        await req.user.save();
        
        res.status(200).json({
            status: "success",
            message: 'Account deactivated successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: 'Error deactivating account',
            error: error.message
        });
    }
};

// Update Tasker Location
const updateTaskerLocation = async (req, res) => {
    const { latitude, longitude } = req.body;
    
    // Check if user is a tasker
    if (!req.tasker) {
        return res.status(403).json({
            status: "error",
            message: 'This endpoint is only available for taskers'
        });
    }
    
    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            status: "error",
            message: 'Both latitude and longitude are required'
        });
    }
    
    // Validate coordinate ranges
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({
            status: "error",
            message: 'Latitude and longitude must be numbers'
        });
    }
    
    if (latitude < -90 || latitude > 90) {
        return res.status(400).json({
            status: "error",
            message: 'Latitude must be between -90 and 90 degrees'
        });
    }
    
    if (longitude < -180 || longitude > 180) {
        return res.status(400).json({
            status: "error",
            message: 'Longitude must be between -180 and 180 degrees'
        });
    }
    
    try {
        // Update tasker location
        req.tasker.location = {
            latitude: latitude,
            longitude: longitude,
            lastUpdated: new Date()
        };
        
        await req.tasker.save();
        
        res.status(200).json({
            status: "success",
            message: 'Location updated successfully',
            location: {
                latitude: req.tasker.location.latitude,
                longitude: req.tasker.location.longitude,
                lastUpdated: req.tasker.location.lastUpdated
            }
        });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            status: "error",
            message: 'Error updating location',
            error: error.message
        });
    }
};

module.exports = {
    userRegister,
    userLogin,
    getUser,
    taskerRegister,
    taskerLogin,
    getTasker,
    verifyEmail,
    resendEmailVerification,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    updateProfilePicture,
    updateTaskerCategories,
    logout,
    deactivateAccount,
    updateTaskerLocation
};
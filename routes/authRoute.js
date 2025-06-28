const express = require('express');
const { 
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
} = require('../controllers/auth-controller');
const { protectUser, protectTasker, protectAny } = require('../middlewares/authMiddleware');

const router = express.Router();

// User routes
router.post('/user-register', userRegister);
router.post('/user-login', userLogin);
router.get('/user', protectUser, getUser);

// Tasker routes
router.post('/tasker-register', taskerRegister);
router.post('/tasker-login', taskerLogin);
router.get('/tasker', protectTasker, getTasker);

// Email verification routes (public)
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendEmailVerification);

// Password reset routes (public)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (require authentication)
router.post('/change-password', protectAny, changePassword);
router.put('/profile', protectAny, updateProfile);
router.put('/profile-picture', protectAny, updateProfilePicture);
router.put('/categories', protectTasker, updateTaskerCategories);
router.put('/location', protectTasker, updateTaskerLocation);
router.post('/logout', protectAny, logout);
router.post('/deactivate-account', protectAny, deactivateAccount);

module.exports = router;
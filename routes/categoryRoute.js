const express = require('express');
const { 
    createCategory, 
    getAllCategories,
    getAllCategoriesAdmin, 
    getCategoryById, 
    updateCategory, 
    deactivateCategory,
    getCategoryStats
} = require('../controllers/category-controller');
const { protectAdmin } = require('../middlewares/adminMiddleware');
const { protectUser } = require('../middlewares/authMiddleware');

// Add admin middleware later for restricted operations

const router = express.Router();

// Public routes (no authentication required)
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Admin protected routes
router.get('/admin/all', protectUser, getAllCategoriesAdmin);
router.get('/admin/:id/stats', protectUser, getCategoryStats);
router.post('/admin', protectUser, createCategory);
router.put('/admin/:id', protectUser, updateCategory);
router.patch('/admin/:id/deactivate', protectUser, deactivateCategory);

module.exports = router; 
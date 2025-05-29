const express = require('express');
const { 
    createCategory, 
    getAllCategories, 
    getCategoryById, 
    updateCategory, 
    deleteCategory 
} = require('../controllers/category-controller');
const { protectUser } = require('../middlewares/authMiddleware');

// Add admin middleware later for restricted operations

const router = express.Router();

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Admin protected routes - temporarily using protectUser until admin role is implemented
router.post('/', protectUser, createCategory);
router.put('/:id', protectUser, updateCategory);
router.delete('/:id', protectUser, deleteCategory);

module.exports = router; 
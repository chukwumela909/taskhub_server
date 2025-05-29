const Category = require('../models/category');
const mongoose = require('mongoose');

// Helper function to check if ID is valid
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// Create a new category (admin only)
const createCategory = async (req, res) => {
    try {
        const { name, description, icon } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                status: "error",
                message: "Category name is required"
            });
        }
        
        // Check if category already exists
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingCategory) {
            return res.status(400).json({
                status: "error",
                message: "Category with this name already exists"
            });
        }
        
        const category = new Category({
            name,
            description: description || '',
            icon: icon || ''
        });
        
        await category.save();
        
        res.status(201).json({
            status: "success",
            message: "Category created successfully",
            category
        });
    } catch (error) {
        console.error("Create category error:", error);
        
        // Handle unique index violation
        if (error.code === 11000) {
            return res.status(400).json({
                status: "error",
                message: "Category with this name already exists"
            });
        }
        
        res.status(500).json({
            status: "error",
            message: "Error creating category",
            error: error.message
        });
    }
};

// Get all categories
const getAllCategories = async (req, res) => {
    try {
        // By default, only return active categories unless specified
        const showInactive = req.query.showInactive === 'true';
        const filter = showInactive ? {} : { active: true };
        
        const categories = await Category.find(filter).sort({ name: 1 });
            
        res.status(200).json({
            status: "success",
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error("Get all categories error:", error);
        res.status(500).json({
            status: "error",
            message: "Error fetching categories",
            error: error.message
        });
    }
};

// Get a specific category by ID
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid category ID format"
            });
        }
        
        const category = await Category.findById(id);
            
        if (!category) {
            return res.status(404).json({
                status: "error",
                message: "Category not found"
            });
        }
        
        res.status(200).json({
            status: "success",
            category
        });
    } catch (error) {
        console.error("Get category by ID error:", error);
        res.status(500).json({
            status: "error",
            message: "Error fetching category",
            error: error.message
        });
    }
};

// Update a category (admin only)
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, active } = req.body;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid category ID format"
            });
        }
        
        const category = await Category.findById(id);
        
        if (!category) {
            return res.status(404).json({
                status: "error",
                message: "Category not found"
            });
        }
        
        // Check for duplicate name if name is being updated
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: id }
            });
            
            if (existingCategory) {
                return res.status(400).json({
                    status: "error",
                    message: "Another category with this name already exists"
                });
            }
        }
        
        // Update fields if provided
        if (name) category.name = name;
        if (description !== undefined) category.description = description;
        if (icon !== undefined) category.icon = icon;
        if (active !== undefined) category.active = active;
        
        await category.save();
        
        res.status(200).json({
            status: "success",
            message: "Category updated successfully",
            category
        });
    } catch (error) {
        console.error("Update category error:", error);
        
        // Handle unique index violation
        if (error.code === 11000) {
            return res.status(400).json({
                status: "error",
                message: "Another category with this name already exists"
            });
        }
        
        res.status(500).json({
            status: "error",
            message: "Error updating category",
            error: error.message
        });
    }
};

// Delete a category (admin only)
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid category ID format"
            });
        }
        
        const category = await Category.findById(id);
        
        if (!category) {
            return res.status(404).json({
                status: "error",
                message: "Category not found"
            });
        }
        
        // Instead of hard deleting, consider setting active to false
        // or check for tasks using this category first
        await Category.findByIdAndDelete(id);
        
        res.status(200).json({
            status: "success",
            message: "Category deleted successfully"
        });
    } catch (error) {
        console.error("Delete category error:", error);
        res.status(500).json({
            status: "error",
            message: "Error deleting category",
            error: error.message
        });
    }
};

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
}; 
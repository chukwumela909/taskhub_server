const Task = require('../models/task');
const mongoose = require('mongoose');

// Helper function to check if ID is valid
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// Create a new task
const createTask = async (req, res) => {
    try {
        const { title, description, category, tags, images, location, budget, isBiddingEnabled, deadline } = req.body;
        
        // Required fields validation
        const requiredFields = {
            title, description, category, 
            'location.latitude': location?.latitude,
            'location.longitude': location?.longitude,
            budget
        };
        
        const missingFields = [];
        for (const [field, value] of Object.entries(requiredFields)) {
            if (value === undefined || value === null) {
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

        // Validate images array if provided
        if (images && Array.isArray(images)) {
            for (let i = 0; i < images.length; i++) {
                if (!images[i].url) {
                    return res.status(400).json({
                        status: "error",
                        message: "Invalid image format",
                        details: `Image at index ${i} is missing the URL`
                    });
                }
            }
        }
        
        // Validate budget
        if (isNaN(budget) || budget <= 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid budget value",
                details: "Budget must be a positive number"
            });
        }
        
        // Validate location coordinates
        if (isNaN(location.latitude) || isNaN(location.longitude)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid location coordinates",
                details: "Latitude and longitude must be valid numbers"
            });
        }
        
        // Validate deadline if provided
        if (deadline) {
            const deadlineDate = new Date(deadline);
            if (isNaN(deadlineDate.getTime()) || deadlineDate < new Date()) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid deadline",
                    details: "Deadline must be a valid future date"
                });
            }
        }
        
        const task = new Task({
            title,
            description,
            category,
            tags: tags || [],
            images: images || [],
            location: {
                latitude: location.latitude,
                longitude: location.longitude,

            },
            budget,
            isBiddingEnabled: isBiddingEnabled || false,
            deadline: deadline || null,
            user: req.user._id
        });
        
        await task.save();
        
        res.status(201).json({
            status: "success",
            message: "Task created successfully",
            task
        });
    } catch (error) {
        console.error("Create task error:", error);
        res.status(500).json({
            status: "error",
            message: "Error creating task",
            error: error.message
        });
    }
};

// Get all tasks with pagination
const getAllTasks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Filter options
        const filterOptions = {};
        
        // Filter by status if provided
        if (req.query.status && ['open', 'assigned', 'in-progress', 'completed', 'cancelled'].includes(req.query.status)) {
            filterOptions.status = req.query.status;
        }
        
        // Filter by category if provided
        if (req.query.category) {
            filterOptions.category = req.query.category;
        }
        
        // Filter by bidding enabled
        if (req.query.isBiddingEnabled) {
            filterOptions.isBiddingEnabled = req.query.isBiddingEnabled === 'true';
        }
        
        // Count total tasks matching the filter
        const totalTasks = await Task.countDocuments(filterOptions);
        
        // Get tasks with pagination
        const tasks = await Task.find(filterOptions)
            .populate('user', 'fullName profilePicture')
            .populate('assignedTasker', 'firstName lastName profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        res.status(200).json({
            status: "success",
            count: tasks.length,
            totalPages: Math.ceil(totalTasks / limit),
            currentPage: page,
            tasks
        });
    } catch (error) {
        console.error("Get all tasks error:", error);
        res.status(500).json({
            status: "error",
            message: "Error fetching tasks",
            error: error.message
        });
    }
};

// Get a specific task by ID
const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid task ID format"
            });
        }
        
        const task = await Task.findById(id)
            .populate('user', 'fullName profilePicture')
            .populate('assignedTasker', 'firstName lastName profilePicture');
            
        if (!task) {
            return res.status(404).json({
                status: "error",
                message: "Task not found"
            });
        }
        
        res.status(200).json({
            status: "success",
            task
        });
    } catch (error) {
        console.error("Get task by ID error:", error);
        res.status(500).json({
            status: "error",
            message: "Error fetching task",
            error: error.message
        });
    }
};

// Update a task
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid task ID format"
            });
        }
        
        const task = await Task.findById(id);
        
        if (!task) {
            return res.status(404).json({
                status: "error",
                message: "Task not found"
            });
        }
        
        // Check if the user is the owner of the task
        if (task.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: "error",
                message: "You are not authorized to update this task"
            });
        }
        
        // Prevent updating certain fields if task is already assigned
        if (task.status !== 'open' && req.body.isBiddingEnabled !== undefined) {
            return res.status(400).json({
                status: "error",
                message: "Cannot modify bidding settings for a task that is not open"
            });
        }
        
        // Validate images array if provided
        if (req.body.images && Array.isArray(req.body.images)) {
            for (let i = 0; i < req.body.images.length; i++) {
                if (!req.body.images[i].url) {
                    return res.status(400).json({
                        status: "error",
                        message: "Invalid image format",
                        details: `Image at index ${i} is missing the URL`
                    });
                }
            }
        }
        
        // Prepare update data
        const updateData = { ...req.body, updatedAt: Date.now() };
        
        // Handle location update
        if (req.body.location) {
            // Validate required location fields if updating location
            if (req.body.location.latitude === undefined || req.body.location.longitude === undefined) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid location data",
                    details: "Latitude and longitude are required when updating location"
                });
            }
            
            // Validate location coordinates
            if (isNaN(req.body.location.latitude) || isNaN(req.body.location.longitude)) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid location coordinates",
                    details: "Latitude and longitude must be valid numbers"
                });
            }
            
            updateData.location = {
                latitude: req.body.location.latitude,
                longitude: req.body.location.longitude,
                address: req.body.location.address || task.location.address || "",
                state: req.body.location.state || task.location.state || "",
                country: req.body.location.country || task.location.country || ""
            };
        }
        
        // Prevent updating user or assignedTasker
        updateData.user = task.user;
        updateData.assignedTasker = task.assignedTasker;
        
        // Update the task
        const updatedTask = await Task.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        
        res.status(200).json({
            status: "success",
            message: "Task updated successfully",
            task: updatedTask
        });
    } catch (error) {
        console.error("Update task error:", error);
        res.status(500).json({
            status: "error",
            message: "Error updating task",
            error: error.message
        });
    }
};

// Delete a task
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid task ID format"
            });
        }
        
        const task = await Task.findById(id);
        
        if (!task) {
            return res.status(404).json({
                status: "error",
                message: "Task not found"
            });
        }
        
        // Check if the user is the owner of the task
        if (task.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: "error",
                message: "You are not authorized to delete this task"
            });
        }
        
        // Prevent deletion if task is already in progress or completed
        if (['in-progress', 'completed'].includes(task.status)) {
            return res.status(400).json({
                status: "error",
                message: `Cannot delete a task that is ${task.status}`
            });
        }
        
        await Task.findByIdAndDelete(id);
        
        res.status(200).json({
            status: "success",
            message: "Task deleted successfully"
        });
    } catch (error) {
        console.error("Delete task error:", error);
        res.status(500).json({
            status: "error",
            message: "Error deleting task",
            error: error.message
        });
    }
};

// Get tasks created by current user with pagination
const getUserTasks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Filter options
        const filterOptions = { user: req.user._id };
        
        // Filter by status if provided
        if (req.query.status && ['open', 'assigned', 'in-progress', 'completed', 'cancelled'].includes(req.query.status)) {
            filterOptions.status = req.query.status;
        }
        
        // Count total tasks matching the filter
        const totalTasks = await Task.countDocuments(filterOptions);
        
        // Get tasks with pagination
        const tasks = await Task.find(filterOptions)
            .populate('assignedTasker', 'firstName lastName profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        res.status(200).json({
            status: "success",
            count: tasks.length,
            totalPages: Math.ceil(totalTasks / limit),
            currentPage: page,
            tasks
        });
    } catch (error) {
        console.error("Get user tasks error:", error);
        res.status(500).json({
            status: "error",
            message: "Error fetching tasks",
            error: error.message
        });
    }
};

// Change task status
const changeTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid task ID format"
            });
        }
        
        // Validate status
        if (!status || !['open', 'assigned', 'in-progress', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid status value",
                details: "Status must be one of: open, assigned, in-progress, completed, cancelled"
            });
        }
        
        const task = await Task.findById(id);
        
        if (!task) {
            return res.status(404).json({
                status: "error",
                message: "Task not found"
            });
        }
        
        // Check authorization based on status change
        const isTaskOwner = task.user.toString() === req.user._id.toString();
        const isAssignedTasker = task.assignedTasker && task.assignedTasker.toString() === req.user._id.toString();
        
        // Task owner can change status to 'cancelled'
        // Assigned tasker can change status to 'in-progress' or 'completed'
        // No one can change status to 'assigned' directly (handled by bid acceptance)
        if (
            (status === 'cancelled' && !isTaskOwner) ||
            (status === 'assigned' && true) || // Always disallow direct assignment
            (['in-progress', 'completed'].includes(status) && !isAssignedTasker)
        ) {
            return res.status(403).json({
                status: "error",
                message: "You are not authorized to change the task status"
            });
        }
        
        // Additional validation for status transitions
        if (
            (status === 'in-progress' && task.status !== 'assigned') ||
            (status === 'completed' && task.status !== 'in-progress')
        ) {
            return res.status(400).json({
                status: "error",
                message: "Invalid status transition",
                details: `Cannot change status from '${task.status}' to '${status}'`
            });
        }
        
        // Update the task status
        task.status = status;
        task.updatedAt = Date.now();
        await task.save();
        
        res.status(200).json({
            status: "success",
            message: "Task status updated successfully",
            task
        });
    } catch (error) {
        console.error("Change task status error:", error);
        res.status(500).json({
            status: "error",
            message: "Error updating task status",
            error: error.message
        });
    }
};

module.exports = {
    createTask,
    getAllTasks,
    getTaskById,
    updateTask,
    deleteTask,
    getUserTasks,
    changeTaskStatus
}; 
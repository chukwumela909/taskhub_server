const Bid = require('../models/bid');
const Task = require('../models/task');
const mongoose = require('mongoose');

// Helper function to check if ID is valid
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// Create a new bid
const createBid = async (req, res) => {
    try {
        const { taskId, amount, message } = req.body;
        
        // Validate required fields
        if (!taskId || !amount) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields",
                missingFields: !taskId ? ['taskId'] : !amount ? ['amount'] : []
            });
        }
        
        // Validate Object ID
        if (!isValidObjectId(taskId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid task ID format"
            });
        }
        
        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid amount value",
                details: "Amount must be a positive number"
            });
        }
        
        // Check if the task exists
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                status: "error",
                message: "Task not found"
            });
        }
        
        // Check if task is open for bidding
        if (task.status !== 'open') {
            return res.status(400).json({
                status: "error",
                message: "Task is not open for bidding",
                details: `Current task status is '${task.status}'`
            });
        }
        
        // Check if bidding is enabled for this task
        if (!task.isBiddingEnabled) {
            return res.status(400).json({
                status: "error",
                message: "Bidding is not enabled for this task"
            });
        }
        
        // Check if the user is not bidding on their own task
        if (task.user.toString() === req.user._id.toString()) {
            return res.status(400).json({
                status: "error",
                message: "You cannot bid on your own task"
            });
        }
        
        // Check if the tasker has already placed a bid on this task
        const existingBid = await Bid.findOne({
            task: taskId,
            tasker: req.user._id
        });
        
        if (existingBid) {
            return res.status(400).json({
                status: "error",
                message: "You have already placed a bid on this task",
                details: "Use the update bid endpoint to modify your existing bid"
            });
        }
        
        const bid = new Bid({
            task: taskId,
            tasker: req.user._id,
            amount,
            message: message || ""
        });
        
        await bid.save();
        
        res.status(201).json({
            status: "success",
            message: "Bid placed successfully",
            bid
        });
    } catch (error) {
        console.error("Create bid error:", error);
        
        // Handle unique index violation (duplicate bid)
        if (error.code === 11000) {
            return res.status(400).json({
                status: "error",
                message: "You have already placed a bid on this task"
            });
        }
        
        res.status(500).json({
            status: "error",
            message: "Error placing bid",
            error: error.message
        });
    }
};

// Update an existing bid
const updateBid = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, message } = req.body;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid bid ID format"
            });
        }
        
        // Validate amount
        if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid amount value",
                details: "Amount must be a positive number"
            });
        }
        
        // Find the bid
        const bid = await Bid.findById(id);
        
        if (!bid) {
            return res.status(404).json({
                status: "error",
                message: "Bid not found"
            });
        }
        
        // Check if the user is the owner of the bid
        if (bid.tasker.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: "error",
                message: "You are not authorized to update this bid"
            });
        }
        
        // Check if the bid is still pending
        if (bid.status !== 'pending') {
            return res.status(400).json({
                status: "error",
                message: "Cannot update a bid that is not pending",
                details: `Current bid status is '${bid.status}'`
            });
        }
        
        // Check if the task is still open
        const task = await Task.findById(bid.task);
        if (!task || task.status !== 'open') {
            return res.status(400).json({
                status: "error",
                message: "Cannot update bid for a task that is not open",
                details: task ? `Current task status is '${task.status}'` : "Task not found"
            });
        }
        
        // Update the bid
        if (amount !== undefined) {
            bid.amount = amount;
        }
        
        if (message !== undefined) {
            bid.message = message;
        }
        
        await bid.save();
        
        res.status(200).json({
            status: "success",
            message: "Bid updated successfully",
            bid
        });
    } catch (error) {
        console.error("Update bid error:", error);
        res.status(500).json({
            status: "error",
            message: "Error updating bid",
            error: error.message
        });
    }
};

// Delete a bid
const deleteBid = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid bid ID format"
            });
        }
        
        // Find the bid
        const bid = await Bid.findById(id);
        
        if (!bid) {
            return res.status(404).json({
                status: "error",
                message: "Bid not found"
            });
        }
        
        // Check if the user is the owner of the bid
        if (bid.tasker.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: "error",
                message: "You are not authorized to delete this bid"
            });
        }
        
        // Check if the bid is still pending
        if (bid.status !== 'pending') {
            return res.status(400).json({
                status: "error",
                message: "Cannot delete a bid that is not pending",
                details: `Current bid status is '${bid.status}'`
            });
        }
        
        await Bid.findByIdAndDelete(id);
        
        res.status(200).json({
            status: "success",
            message: "Bid deleted successfully"
        });
    } catch (error) {
        console.error("Delete bid error:", error);
        res.status(500).json({
            status: "error",
            message: "Error deleting bid",
            error: error.message
        });
    }
};

// Get all bids for a task (task owner only)
const getTaskBids = async (req, res) => {
    try {
        const { taskId } = req.params;
        
        // Validate Object ID
        if (!isValidObjectId(taskId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid task ID format"
            });
        }
        
        // Check if the task exists
        const task = await Task.findById(taskId);
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
                message: "You are not authorized to view bids for this task"
            });
        }
        
        const bids = await Bid.find({ task: taskId })
            .populate('tasker', 'firstName lastName profilePicture')
            .sort({ createdAt: -1 });
            
        res.status(200).json({
            status: "success",
            count: bids.length,
            bids
        });
    } catch (error) {
        console.error("Get task bids error:", error);
        res.status(500).json({
            status: "error",
            message: "Error fetching bids",
            error: error.message
        });
    }
};

// Accept a bid (task owner only)
const acceptBid = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid bid ID format"
            });
        }
        
        const bid = await Bid.findById(id).populate('task');
            
        if (!bid) {
            return res.status(404).json({
                status: "error",
                message: "Bid not found"
            });
        }
        
        // Check if the task exists
        if (!bid.task) {
            return res.status(404).json({
                status: "error",
                message: "Task not found for this bid"
            });
        }
        
        // Check if the user is the owner of the task
        if (bid.task.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: "error",
                message: "You are not authorized to accept bids for this task"
            });
        }
        
        // Check if the task is still open
        if (bid.task.status !== 'open') {
            return res.status(400).json({
                status: "error",
                message: "Cannot accept a bid for a task that is not open",
                details: `Current task status is '${bid.task.status}'`
            });
        }
        
        // Check if the bid is still pending
        if (bid.status !== 'pending') {
            return res.status(400).json({
                status: "error",
                message: "Cannot accept a bid that is not pending",
                details: `Current bid status is '${bid.status}'`
            });
        }
        
        // Start a session for the transaction
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Update bid status
            bid.status = 'accepted';
            await bid.save({ session });
            
            // Update task status and assigned tasker
            await Task.findByIdAndUpdate(
                bid.task._id,
                {
                    status: 'assigned',
                    assignedTasker: bid.tasker,
                    updatedAt: Date.now()
                },
                { session }
            );
            
            // Reject all other bids for this task
            await Bid.updateMany(
                {
                    task: bid.task._id,
                    _id: { $ne: id }
                },
                {
                    status: 'rejected'
                },
                { session }
            );
            
            // Commit the transaction
            await session.commitTransaction();
            session.endSession();
            
            res.status(200).json({
                status: "success",
                message: "Bid accepted successfully",
                bid
            });
        } catch (error) {
            // Abort the transaction on error
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error("Accept bid error:", error);
        res.status(500).json({
            status: "error",
            message: "Error accepting bid",
            error: error.message
        });
    }
};

// Get bids placed by current tasker
const getTaskerBids = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Filter options
        const filterOptions = { tasker: req.user._id };
        
        // Filter by status if provided
        if (req.query.status && ['pending', 'accepted', 'rejected'].includes(req.query.status)) {
            filterOptions.status = req.query.status;
        }
        
        // Count total bids matching the filter
        const totalBids = await Bid.countDocuments(filterOptions);
        
        // Get bids with pagination
        const bids = await Bid.find(filterOptions)
            .populate({
                path: 'task',
                select: 'title description budget status createdAt'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        res.status(200).json({
            status: "success",
            count: bids.length,
            totalPages: Math.ceil(totalBids / limit),
            currentPage: page,
            bids
        });
    } catch (error) {
        console.error("Get tasker bids error:", error);
        res.status(500).json({
            status: "error",
            message: "Error fetching bids",
            error: error.message
        });
    }
};

// Get a specific bid by ID
const getBidById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate Object ID
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid bid ID format"
            });
        }
        
        const bid = await Bid.findById(id)
            .populate({
                path: 'task',
                select: 'title description budget status user'
            })
            .populate('tasker', 'firstName lastName profilePicture');
            
        if (!bid) {
            return res.status(404).json({
                status: "error",
                message: "Bid not found"
            });
        }
        
        // Check if the user is authorized to view this bid
        const isTasker = bid.tasker._id.toString() === req.user._id.toString();
        const isTaskOwner = bid.task.user.toString() === req.user._id.toString();
        
        if (!isTasker && !isTaskOwner) {
            return res.status(403).json({
                status: "error",
                message: "You are not authorized to view this bid"
            });
        }
        
        res.status(200).json({
            status: "success",
            bid
        });
    } catch (error) {
        console.error("Get bid by ID error:", error);
        res.status(500).json({
            status: "error",
            message: "Error fetching bid",
            error: error.message
        });
    }
};

module.exports = {
    createBid,
    updateBid,
    deleteBid,
    getTaskBids,
    acceptBid,
    getTaskerBids,
    getBidById
}; 
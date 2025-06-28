const express = require('express');
const { 
    createTask, 
    getAllTasks, 
    getTaskById, 
    updateTask, 
    deleteTask, 
    getUserTasks,
    changeTaskStatus,
    getTaskerFeed
} = require('../controllers/task-controller');
const { protectUser, protectTasker } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllTasks);
router.get('/:id', getTaskById);

// User protected routes
router.post('/', protectUser, createTask);
router.put('/:id', protectUser, updateTask);
router.delete('/:id', protectUser, deleteTask);
router.get('/user/tasks', protectUser, getUserTasks);

// Tasker protected routes
router.get('/tasker/feed', protectTasker, getTaskerFeed);

// Task status routes
router.patch('/:id/status', protectUser, changeTaskStatus); // For user to cancel task
router.patch('/:id/status/tasker', protectTasker, changeTaskStatus); // For tasker to update status

module.exports = router; 
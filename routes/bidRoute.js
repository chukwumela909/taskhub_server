const express = require('express');
const { 
    createBid, 
    updateBid,
    deleteBid,
    getTaskBids, 
    acceptBid, 
    getTaskerBids,
    getBidById
} = require('../controllers/bid-controller');
const { protectUser, protectTasker } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tasker bid routes
router.post('/', protectTasker, createBid);
router.put('/:id', protectTasker, updateBid);
router.delete('/:id', protectTasker, deleteBid);
router.get('/tasker/bids', protectTasker, getTaskerBids);

// User bid routes
router.get('/task/:taskId', protectUser, getTaskBids);
router.patch('/:id/accept', protectUser, acceptBid);

// Both user and tasker can view a specific bid (if authorized)
router.get('/:id', protectUser, getBidById); // This will work for taskers too due to the bid ownership check

module.exports = router; 
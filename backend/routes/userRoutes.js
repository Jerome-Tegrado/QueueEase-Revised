const express = require('express');
const { loginUser, getUserQueueNumber, addUserTransaction, getAllQueueTransactions } = require('../controllers/userController');
const router = express.Router();

// Login Route
router.post('/login', loginUser);

// Get User Queue Number Route
router.get('/queue/:userId', getUserQueueNumber);

// Add Transaction Route
router.post('/transaction', addUserTransaction);

// Get All Queue Transactions Route
router.get('/queue', getAllQueueTransactions);

module.exports = router;

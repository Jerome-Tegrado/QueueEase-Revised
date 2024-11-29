const express = require('express');
const {
    loginUser,
    getUserQueueNumber,
    addUserTransaction,
    getAllQueueTransactions,
    getUserNotifications,
    updateTransactionStatus,
} = require('../controllers/userController');
const router = express.Router();

// Login Route
router.post('/login', loginUser);

// Get User Queue Number Route
router.get('/queue/:userId', getUserQueueNumber);

// Add Transaction Route
router.post('/transaction', addUserTransaction);

// Get All Queue Transactions Route
router.get('/queue', getAllQueueTransactions);

// Get Notifications for a User Route
router.get('/notifications/:userId', getUserNotifications);

// Update Transaction Status Route
router.put('/transaction/:transaction_id', updateTransactionStatus);

// WebSocket-specific endpoint for real-time updates (optional)
router.post('/queue/notify', (req, res) => {
    const { userId, data } = req.body;

    if (!userId || !data) {
        return res.status(400).json({ message: 'User ID and data are required.' });
    }

    try {
        const { notifyUserQueueUpdate } = require('../socket');
        notifyUserQueueUpdate(userId, data); // Emit real-time notification
        res.status(200).json({ message: 'Notification sent successfully.' });
    } catch (error) {
        console.error('Error notifying user:', error.message);
        res.status(500).json({ message: 'Failed to notify user.' });
    }
});

module.exports = router;

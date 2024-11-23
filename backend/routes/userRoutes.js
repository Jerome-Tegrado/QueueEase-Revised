const express = require('express');
const { loginUser, getUserQueueNumber } = require('../controllers/userController');
const router = express.Router();

// Login Route
router.post('/login', loginUser);

// Get User Queue Number Route
router.get('/queue/:userId', getUserQueueNumber);

module.exports = router;

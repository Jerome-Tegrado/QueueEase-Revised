const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// Register user
router.post('/register', registerUser);

// Login user
router.post('/login', loginUser);

// Handle other authentication-related routes here (if needed)

module.exports = router;

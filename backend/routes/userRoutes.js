const express = require('express');
const { loginUser } = require('../controllers/userController');
const router = express.Router();

// Login Route
router.post('/login', loginUser);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getAllUsers, manageQueue, sendNotification } = require('../controllers/adminController');

router.get('/users', getAllUsers);
router.post('/queue', manageQueue);
router.post('/notification', sendNotification);

module.exports = router;

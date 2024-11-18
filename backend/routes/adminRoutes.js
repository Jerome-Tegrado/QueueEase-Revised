const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  manageQueue,
  sendNotification,
  getQueue,
  getAllServices,
  getCurrentServingQueue, // Added function for current queue
  updateQueueStatus,      // Added function for queue actions
  addTransaction          // Added function for user transactions
} = require('../controllers/adminController');
const { db } = require('../models/database');

// User Management
router.get('/users', getAllUsers);
router.post('/users', (req, res) => {
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;
  db.run(
    `INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [first_name, last_name, address, zip_code, contact_number, email, password, role || 'user'],
    function (err) {
      if (err) {
        console.error('Error adding user:', err.message);
        res.status(500).json({ message: 'Failed to add user.' });
      } else {
        res.status(201).json({ id: this.lastID, message: 'User added successfully.' });
      }
    }
  );
});
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ message: 'Error retrieving user for update.' });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const updatedPassword = password || user.password;
    db.run(
      `UPDATE users 
       SET first_name = ?, last_name = ?, address = ?, zip_code = ?, contact_number = ?, email = ?, password = ?, role = ?
       WHERE id = ?`,
      [
        first_name || user.first_name,
        last_name || user.last_name,
        address || user.address,
        zip_code || user.zip_code,
        contact_number || user.contact_number,
        email || user.email,
        updatedPassword,
        role || user.role,
        id
      ],
      function (err) {
        if (err) return res.status(500).json({ message: 'Error updating user.' });
        res.status(200).json({ message: 'User updated successfully.' });
      }
    );
  });
});
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to delete user.' });
    res.status(200).json({ message: 'User deleted successfully.' });
  });
});

// Queue Management
router.get('/queue', getQueue);
router.get('/queue/current', getCurrentServingQueue);
router.put('/queue/:queueNumber/:action', updateQueueStatus);

// Services Management
router.get('/services', getAllServices);
router.post('/services', (req, res) => {
  const { service_name, description } = req.body;
  db.run(
    `INSERT INTO services (service_name, description) VALUES (?, ?)`,
    [service_name, description],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to add service.' });
      res.status(201).json({ message: 'Service added successfully.' });
    }
  );
});
router.put('/services/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  const { service_name, description } = req.body;
  db.run(
    `UPDATE services SET service_name = ?, description = ? WHERE service_id = ?`,
    [service_name, description, serviceId],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to update service.' });
      res.status(200).json({ message: 'Service updated successfully.' });
    }
  );
});
router.delete('/services/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  db.run('DELETE FROM services WHERE service_id = ?', [serviceId], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to delete service.' });
    res.status(200).json({ message: 'Service deleted successfully.' });
  });
});

// Add transaction
router.post('/transactions', addTransaction);

// Notifications
router.post('/notification', sendNotification);

module.exports = router;

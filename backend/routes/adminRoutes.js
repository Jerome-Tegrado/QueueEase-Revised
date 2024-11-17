const express = require('express');
const router = express.Router();
const { getAllUsers, manageQueue, sendNotification } = require('../controllers/adminController');
const { db } = require('../models/database');

// Existing routes
router.get('/users', getAllUsers);
router.post('/queue', manageQueue);
router.post('/notification', sendNotification);

// Add a new user
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

// Update an existing user
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

  db.run(
    `UPDATE users SET first_name = ?, last_name = ?, address = ?, zip_code = ?, contact_number = ?, email = ?, password = ?, role = ?
    WHERE id = ?`,
    [first_name, last_name, address, zip_code, contact_number, email, password, role, id],
    function (err) {
      if (err) {
        console.error('Error updating user:', err.message);
        res.status(500).json({ message: 'Failed to update user.' });
      } else if (this.changes === 0) {
        res.status(404).json({ message: 'User not found.' });
      } else {
        res.status(200).json({ message: 'User updated successfully.' });
      }
    }
  );
});

// Delete a user
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting user:', err.message);
      res.status(500).json({ message: 'Failed to delete user.' });
    } else if (this.changes === 0) {
      res.status(404).json({ message: 'User not found.' });
    } else {
      res.status(200).json({ message: 'User deleted successfully.' });
    }
  });
});

module.exports = router;

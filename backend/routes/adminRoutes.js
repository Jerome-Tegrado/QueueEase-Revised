const express = require('express');
const router = express.Router();
const { getAllUsers, manageQueue, sendNotification } = require('../controllers/adminController');
const { db } = require('../models/database');

// Fetch all users
router.get('/users', getAllUsers);

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

  // Fetch the existing user to preserve the password if it's not being updated
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error('Error fetching user for update:', err.message);
      return res.status(500).json({ message: 'Error retrieving user for update.' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Preserve the current password if not provided in the request
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
        id,
      ],
      function (err) {
        if (err) {
          console.error('Error updating user:', err.message);
          return res.status(500).json({ message: 'Error updating user.' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: 'User not updated (no changes made).' });
        }

        res.status(200).json({ message: 'User updated successfully.' });
      }
    );
  });
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

// Queue management route
router.post('/queue', manageQueue);

// Send notification route
router.post('/notification', sendNotification);

module.exports = router;

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const TransactionModel = require('../models/transactionModel');
const { sendNotification } = require('../controllers/adminController');
const { notifyQueueUpdate } = require('../socket');

// User Management Routes
router.post('/users', (req, res) => {
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

  const query = `
    INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(
    query,
    [first_name, last_name, address, zip_code, contact_number, email, password, role || 'user'],
    function (err) {
      if (err) {
        console.error('Error adding user:', err.message);
        return res.status(500).json({ message: 'Failed to add user.' });
      }
      res.status(201).json({ id: this.lastID, message: 'User added successfully.' });
    }
  );
});

router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

  const query = `
    UPDATE users
    SET first_name = ?, last_name = ?, address = ?, zip_code = ?, contact_number = ?, email = ?, password = ?, role = ?
    WHERE id = ?
  `;

  db.run(
    query,
    [first_name, last_name, address, zip_code, contact_number, email, password, role, id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to update user.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }
      res.status(200).json({ message: 'User updated successfully.' });
    }
  );
});

router.delete('/users/:id', (req, res) => {
  const query = `DELETE FROM users WHERE id = ?`;

  db.run(query, [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete user.' });
    }
    res.status(200).json({ message: 'User deleted successfully.' });
  });
});

// Transactions Management: Add Transaction
router.post('/transactions', (req, res) => {
  const { user_id, service_id } = req.body;

  if (!user_id || !service_id) {
    return res.status(400).json({ error: 'User ID and Service ID are required.' });
  }

  TransactionModel.createTransaction({ user_id, service_id }, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message || 'Failed to create transaction.' });
    }

    notifyQueueUpdate(); // Notify clients of queue changes
    res.status(201).json({
      message: 'Transaction created successfully.',
      queue_number: result.lastID,
    });
  });
});

// Queue Management: Get Live Queue Data
router.get('/queue', (req, res) => {
  const query = `
    SELECT 
      t.queue_number,
      t.user_id,
      s.service_name AS transaction_type,
      t.status
    FROM transactions t
    LEFT JOIN services s ON t.service_id = s.service_id
    WHERE t.status = 'waiting'
    ORDER BY t.queue_number ASC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch the queue.' });
    }
    res.json(rows);
  });
});

// Queue Management: Update Transaction Status
router.put('/queue/:queueNumber/:action', (req, res) => {
  const { queueNumber, action } = req.params;

  let status;
  if (action === 'complete') {
    status = 'completed';
  } else if (action === 'cancel') {
    status = 'canceled';
  } else {
    return res.status(400).json({ error: 'Invalid action.' });
  }

  const updateQuery = `
    UPDATE transactions
    SET status = ?
    WHERE queue_number = ?
  `;

  db.run(updateQuery, [status, queueNumber], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update queue status.' });
    }

    // Reassign queue numbers after updating the transaction
    TransactionModel.reassignQueueNumbers((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to reassign queue numbers.' });
      }

      notifyQueueUpdate(); // Notify clients of queue changes
      res.status(200).json({ message: `Queue #${queueNumber} updated and queue reassigned.` });
    });
  });
});

// Services Management Routes
router.get('/services', (req, res) => {
  const query = `SELECT * FROM services`;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch services.' });
    }
    res.json(rows);
  });
});

router.post('/services', (req, res) => {
  const { service_name, description } = req.body;

  const query = `INSERT INTO services (service_name, description) VALUES (?, ?)`;

  db.run(query, [service_name, description], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to add service.' });
    }
    res.status(201).json({ message: 'Service added successfully.' });
  });
});

router.put('/services/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  const { service_name, description } = req.body;

  const query = `
    UPDATE services 
    SET service_name = ?, description = ? 
    WHERE service_id = ?
  `;

  db.run(query, [service_name, description, serviceId], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to update service.' });
    }
    res.status(200).json({ message: 'Service updated successfully.' });
  });
});

router.delete('/services/:serviceId', (req, res) => {
  const query = `DELETE FROM services WHERE service_id = ?`;

  db.run(query, [req.params.serviceId], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete service.' });
    }
    res.status(200).json({ message: 'Service deleted successfully.' });
  });
});

// Notifications
router.post('/notification', sendNotification);

module.exports = router;

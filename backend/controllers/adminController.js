const { db } = require('../models/database');

// User Management
exports.getAllUsers = (req, res) => {
  db.all('SELECT * FROM users ORDER BY id ASC', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Internal server error.' });
    res.json(rows);
  });
};

// Queue Management
exports.getQueue = (req, res) => {
  db.all('SELECT * FROM transactions ORDER BY queue_number ASC', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch queue.' });
    res.json(rows);
  });
};
exports.getCurrentServingQueue = (req, res) => {
  db.get(
    'SELECT queue_number FROM transactions WHERE status = "waiting" ORDER BY queue_number ASC LIMIT 1',
    (err, row) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch current queue.' });
      res.json(row || { queue_number: 'None' });
    }
  );
};
exports.updateQueueStatus = (req, res) => {
  const { queueNumber, action } = req.params;
  let status;
  switch (action) {
    case 'prioritize':
      status = 'prioritized';
      break;
    case 'complete':
      status = 'completed';
      break;
    case 'cancel':
      status = 'canceled';
      break;
    default:
      return res.status(400).json({ message: 'Invalid action.' });
  }
  db.run(
    `UPDATE transactions SET status = ? WHERE queue_number = ?`,
    [status, queueNumber],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to update queue.' });
      res.json({ message: `Queue #${queueNumber} updated to ${status}.` });
    }
  );
};

// Service Management
exports.getAllServices = (req, res) => {
  db.all('SELECT * FROM services ORDER BY service_id ASC', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch services.' });
    res.json(rows);
  });
};

// Transactions
exports.addTransaction = (req, res) => {
  const { user_id, transaction_type, additional_details } = req.body;
  db.run(
    `INSERT INTO transactions (user_id, transaction_type, queue_number, status)
     VALUES (?, ?, (SELECT COALESCE(MAX(queue_number), 0) + 1 FROM transactions), 'waiting')`,
    [user_id, transaction_type],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to add transaction.' });
      res.status(201).json({ transaction_id: this.lastID, message: 'Transaction added successfully.' });
    }
  );
};

// Notifications
exports.sendNotification = (req, res) => {
  const { user_id, message } = req.body;
  db.run(
    `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
    [user_id, message],
    (err) => {
      if (err) return res.status(500).json({ message: 'Failed to send notification.' });
      res.json({ message: 'Notification sent successfully.' });
    }
  );
};

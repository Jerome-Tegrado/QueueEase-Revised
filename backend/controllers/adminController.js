const { db } = require('../models/database');

exports.getAllUsers = (req, res) => {
    const query = `SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC`;
    db.all('SELECT * FROM users ORDER BY id ASC', (err, rows) => {
        if (err) {
          console.error('Error fetching users:', err);
          res.status(500).json({ message: 'Internal server error.' });
        } else {
          res.json(rows); // Return users sorted by ID
        }
      });
      
};

exports.manageQueue = (req, res) => {
    const { transaction_id, status } = req.body;

    const query = `UPDATE transactions SET status = ? WHERE transaction_id = ?`;
    db.run(query, [status, transaction_id], (err) => {
        if (err) return res.status(500).send('Error updating queue.');
        res.send('Queue updated successfully.');
    });
};

exports.sendNotification = (req, res) => {
    const { user_id, message } = req.body;

    const query = `
        INSERT INTO notifications (user_id, message)
        VALUES (?, ?)
    `;
    db.run(query, [user_id, message], (err) => {
        if (err) return res.status(500).send('Error sending notification.');
        res.send('Notification sent successfully.');
    });
};
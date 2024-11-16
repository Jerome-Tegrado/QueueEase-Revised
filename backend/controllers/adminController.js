const { db } = require('../models/database');

exports.getAllUsers = (req, res) => {
    const query = `SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).send('Error retrieving users.');
        res.json(rows);
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

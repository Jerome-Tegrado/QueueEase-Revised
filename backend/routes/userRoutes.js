const express = require('express');
const { Database } = require('sqlite3').verbose();
const router = express.Router();

// Database connection
const db = new Database('./database/queueease.db');

// Login Route
router.post('/login', (req, res) => {
    // Add your login logic here
});

// Fetch queue status for a specific user
router.get('/queue-status/:userId', (req, res) => {
    const userId = req.params.userId;

    const currentlyServingQuery = `
        SELECT queue_number, 
               (SELECT service_name FROM services WHERE service_id = t.service_id) AS service_name
        FROM transactions t
        WHERE t.status IN ('in-progress', 'waiting') -- Allow fallback to 'waiting'
        ORDER BY queue_number ASC
        LIMIT 1
    `;

    const userQueueQuery = `
        SELECT queue_number, 
               (SELECT service_name FROM services WHERE service_id = t.service_id) AS service_name
        FROM transactions t
        WHERE t.user_id = ? AND t.status IN ('waiting', 'in-progress')
        ORDER BY queue_number ASC
        LIMIT 1
    `;

    db.get(currentlyServingQuery, [], (err, currentlyServing) => {
        if (err) {
            console.error('Error fetching currently serving queue:', err.message);
            return res.status(500).json({ error: 'Failed to fetch currently serving queue.' });
        }

        db.get(userQueueQuery, [userId], (err, userQueue) => {
            if (err) {
                console.error('Error fetching user queue:', err.message);
                return res.status(500).json({ error: 'Failed to fetch user queue.' });
            }

            res.json({
                currently_serving: currentlyServing || { queue_number: 'None', service_name: 'N/A' },
                user_queue: userQueue || { queue_number: 'Not in queue', service_name: 'N/A' },
            });
        });
    });
});


// Fetch all services for dropdown
router.get('/services', (req, res) => {
    const query = `SELECT service_id, service_name FROM services`;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching services:', err.message);
            return res.status(500).json({ error: 'Failed to fetch services.' });
        }

        res.json(rows);
    });
});

// Add a transaction (join the queue)
router.post('/transactions', (req, res) => {
    const { user_id, service_id } = req.body;

    if (!user_id || !service_id) {
        return res.status(400).json({ error: 'User ID and Service ID are required.' });
    }

    // Check if user already has an active transaction
    const checkActiveTransactionQuery = `
        SELECT * FROM transactions
        WHERE user_id = ? AND status IN ('waiting', 'in-progress')
        LIMIT 1
    `;

    db.get(checkActiveTransactionQuery, [user_id], (err, activeTransaction) => {
        if (err) {
            console.error('Error checking active transactions:', err.message);
            return res.status(500).json({ error: 'Failed to check active transactions.' });
        }

        if (activeTransaction) {
            return res.status(400).json({ error: 'You already have an active transaction.' });
        }

        // Add new transaction if no active transaction exists
        const insertQuery = `
            INSERT INTO transactions (user_id, service_id, queue_number, status)
            VALUES (?, ?, (SELECT COALESCE(MAX(queue_number), 0) + 1 FROM transactions), 'waiting')
        `;

        db.run(insertQuery, [user_id, service_id], function (err) {
            if (err) {
                console.error('Error adding transaction:', err.message);
                return res.status(500).json({ error: 'Failed to join the queue.' });
            }

            res.status(200).json({ message: 'Successfully joined the queue.', queue_number: this.lastID });
        });
    });
});

// Fetch notifications for a specific user
router.get('/notifications/:userId', (req, res) => {
    const userId = req.params.userId;
    const limit = req.query.limit ? parseInt(req.query.limit) : 0; // Default limit: 0 (no limit)
  
    const query = `
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      ${limit > 0 ? `LIMIT ?` : ''}
    `;
  
    db.all(query, limit > 0 ? [userId, limit] : [userId], (err, rows) => {
      if (err) {
        console.error('Error fetching notifications:', err.message);
        return res.status(500).json({ error: 'Failed to fetch notifications.' });
      }
  
      res.json(rows);
    });
  });
  

  
module.exports = router;

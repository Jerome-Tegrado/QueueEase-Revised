const db = require('../models/database');

// Get the user's queue number
exports.getUserQueueNumber = (req, res) => {
  const { userId } = req.params;

  db.get(
    `SELECT queue_number FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId],
    (err, row) => {
      if (err) {
        console.error('Error fetching user queue number:', err.message);
        res.status(500).json({ message: 'Failed to fetch user queue number.' });
      } else {
        res.json(row || { queue_number: 'None' });
      }
    }
  );
};
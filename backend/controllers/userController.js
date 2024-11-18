const db = require('../models/database');

// Login User
exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  // Query the database for the user
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Internal server error.' });
    }

    if (!user) {
      return res.status(401).send({ message: 'Account not created.', redirect: '/register.html' });
    }

    // Compare plain-text password
    if (password !== user.password) {
      return res.status(401).send({ message: 'Invalid password.' });
    }

    // Determine the role and respond
    if (user.role === 'admin') {
      res.status(200).send({ message: 'Welcome, Admin!', role: 'admin', redirect: '/admin-dashboard.html' });
    } else if (user.role === 'user') {
      res.status(200).send({ message: 'Welcome, User!', role: 'user', redirect: '/user-dashboard.html' });
    } else {
      res.status(403).send({ message: 'Invalid role.' });
    }
  });
};


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
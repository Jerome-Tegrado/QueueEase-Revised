const db = require('../models/database').db; // Ensure correct database reference

// Login User
exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.error('Missing email or password');
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  console.log('Received email:', trimmedEmail);

  db.get(
    `SELECT * FROM users WHERE email = ? AND password = ?`,
    [trimmedEmail, trimmedPassword],
    (err, user) => {
      if (err) {
        console.error('Error querying database:', err.message);
        return res.status(500).json({ message: 'Failed to log in.' });
      }

      if (!user) {
        console.log('No user found for email and password:', trimmedEmail);
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      console.log('User found:', user);
      // Return user details and redirect based on role
      if (user.role === 'admin') {
        return res.status(200).json({
          message: 'Welcome, Admin!',
          redirect: 'admin-dashboard.html',
          user: { id: user.id, email: user.email, role: user.role },
        });
      } else if (user.role === 'user') {
        return res.status(200).json({
          message: 'Welcome, User!',
          redirect: 'user-queue.html',
          user: { id: user.id, email: user.email, role: user.role },
        });
      } else {
        console.log('Unauthorized role:', user.role);
        return res.status(403).json({ message: 'Unauthorized role.' });
      }
    }
  );
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

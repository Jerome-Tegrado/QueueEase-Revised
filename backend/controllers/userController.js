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

      // Store user ID in session for unique user identification
      req.session.user_id = user.id;

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

// Add transaction for user
exports.addUserTransaction = (req, res) => {
  const { user_id, service_id } = req.body;

  // Ensure the user_id is from the session for uniqueness
  if (req.session.user_id !== user_id) {
    return res.status(403).json({ message: 'Unauthorized action.' });
  }

  // Check if the user already has an active transaction
  const checkTransactionQuery = `
    SELECT * FROM transactions 
    WHERE user_id = ? AND status IN ('waiting', 'in-progress')
    LIMIT 1
  `;
  db.get(checkTransactionQuery, [user_id], (err, activeTransaction) => {
    if (err) {
      console.error('Error checking existing transaction:', err.message);
      return res.status(500).json({ message: 'Failed to check for active transactions.' });
    }

    if (activeTransaction) {
      return res.status(400).json({ message: 'You already have an ongoing transaction. Complete it before starting a new one.' });
    }

    // If no active transaction, proceed to add a new transaction
    const getMaxQueueNumberQuery = `
      SELECT MAX(queue_number) AS max_queue_number 
      FROM transactions
    `;
    db.get(getMaxQueueNumberQuery, [], (err, row) => {
      if (err) {
        console.error('Error fetching max queue number:', err.message);
        return res.status(500).json({ message: 'Failed to determine the next queue number.' });
      }

      const nextQueueNumber = (row.max_queue_number || 0) + 1;

      const insertQuery = `
        INSERT INTO transactions (user_id, service_id, queue_number, status)
        VALUES (?, ?, ?, 'waiting')
      `;
      db.run(insertQuery, [user_id, service_id, nextQueueNumber], function (err) {
        if (err) {
          console.error('Error adding transaction:', err.message);
          return res.status(500).json({ message: 'Failed to add transaction.' });
        }

        res.status(201).json({
          transaction_id: this.lastID,
          queue_number: nextQueueNumber,
          message: 'Transaction added successfully.',
        });
      });
    });
  });
};

// Fetch all transactions for queue display
exports.getAllQueueTransactions = (req, res) => {
  db.all(
    `SELECT * FROM transactions WHERE status IN ('waiting', 'in-progress') ORDER BY created_at ASC`,
    (err, rows) => {
      if (err) {
        console.error('Error fetching transactions:', err.message);
        return res.status(500).json({ message: 'Failed to fetch transactions.' });
      }
      res.json(rows);
    }
  );
};

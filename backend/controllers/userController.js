const db = require('../models/database').db; // Ensure correct database reference
const NotificationModel = require('../models/notificationModel'); // Import notification model
const { io } = require('../socket'); // Import socket instance

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

      req.session.user_id = user.id;

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

  if (req.session.user_id !== user_id) {
    return res.status(403).json({ message: 'Unauthorized action.' });
  }

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

    const insertQuery = `
      INSERT INTO transactions (user_id, service_id, status)
      VALUES (?, ?, 'waiting')
    `;
    db.run(insertQuery, [user_id, service_id], function (err) {
      if (err) {
        console.error('Error adding transaction:', err.message);
        return res.status(500).json({ message: 'Failed to add transaction.' });
      }

      reorderQueue((reorderErr) => {
        if (reorderErr) {
          console.error('Error reordering queue:', reorderErr.message);
          return res.status(500).json({ message: 'Failed to reorder the queue.' });
        }

        res.status(201).json({
          transaction_id: this.lastID,
          message: 'Transaction added successfully.',
        });
      });
    });
  });
};

// Fetch all queue transactions
exports.getAllQueueTransactions = (req, res) => {
  db.all(
    `SELECT * FROM transactions WHERE status IN ('waiting', 'in-progress') ORDER BY queue_number ASC`,
    (err, rows) => {
      if (err) {
        console.error('Error fetching transactions:', err.message);
        return res.status(500).json({ message: 'Failed to fetch transactions.' });
      }
      res.status(200).json(rows);
    }
  );
};

// Fetch user notifications
exports.getUserNotifications = (req, res) => {
  const { userId } = req.params;

  db.all(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching notifications:', err.message);
        return res.status(500).json({ message: 'Failed to fetch notifications.' });
      }
      res.status(200).json(rows);
    }
  );
};

// Update transaction status and send notifications
exports.updateTransactionStatus = (req, res) => {
  const { transaction_id, status } = req.body;

  db.run(
    `UPDATE transactions SET status = ? WHERE transaction_id = ?`,
    [status, transaction_id],
    function (err) {
      if (err) {
        console.error('Error updating transaction status:', err.message);
        return res.status(500).json({ message: 'Failed to update transaction status.' });
      }

      db.get(
        `SELECT * FROM transactions WHERE transaction_id = ?`,
        [transaction_id],
        (err, transaction) => {
          if (err) {
            console.error('Error fetching transaction:', err.message);
            return res.status(500).json({ message: 'Failed to fetch transaction.' });
          }

          // Emit notification through WebSocket
          const message = status === 'in-progress'
            ? 'It is now your time to be served.'
            : 'Your transaction is complete.';
          io.to(transaction.user_id.toString()).emit('transactionUpdated', { message });

          res.status(200).json({ message: 'Transaction status updated successfully.' });
        }
      );
    }
  );
};


// Helper function to send notifications and emit WebSocket events
function sendNotificationAndEmit(userId, message) {
  NotificationModel.createNotification(
    { user_id: userId, message },
    (err) => {
      if (err) {
        console.error('Error creating notification:', err.message);
      }
    }
  );
  io.to(userId.toString()).emit('queueUpdate', { message });
}

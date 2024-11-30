const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session'); // Added session support
const { db, initializeDB } = require('./models/database');
const path = require('path');
const { loginUser, registerUser } = require('./controllers/authController');
const {
  initSocket,
  notifyQueueUpdate,
  notifyUserQueueUpdate,
  notifyTransactionUpdate,
  notifyNextUser,
} = require('./socket'); // Import socket functions

dotenv.config();

const app = express();
const http = require('http').createServer(app); // Required for WebSocket server

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: 'queueease_secret', // Replace with a secure random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set `secure: true` when using HTTPS
  })
);

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Login route for handling login logic
app.post('/user/login', loginUser);

// Services route
app.get('/api/services', (req, res) => {
  const query = `SELECT * FROM services`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Registration Route
app.post('/api/register', (req, res) => {
  const { first_name, last_name, address, zip_code, contact_number, email, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: 'Required fields are missing.' });
  }

  const query = `
        INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

  db.run(
    query,
    [first_name, last_name, address, zip_code, contact_number, email, password],
    (err) => {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ message: 'Email already exists.' });
        }
        console.error('Database error:', err.message);
        return res.status(500).json({ message: 'Internal server error.' });
      }
      res.status(201).json({ message: 'User registered successfully!' });
    }
  );
});

// User Management Routes (for Admins)
app.get('/api/admin/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err.message);
      return res.status(500).json({ message: 'Failed to fetch users.' });
    }
    res.status(200).json(rows);
  });
});

app.post('/api/admin/users', (req, res) => {
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

  db.run(
    `INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

app.put('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

  db.run(
    `UPDATE users SET first_name = ?, last_name = ?, address = ?, zip_code = ?, contact_number = ?, email = ?, password = ?, role = ?
        WHERE id = ?`,
    [first_name, last_name, address, zip_code, contact_number, email, password, role, id],
    function (err) {
      if (err) {
        console.error('Error updating user:', err.message);
        return res.status(500).json({ message: 'Failed to update user.' });
      } else if (this.changes === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }
      res.status(200).json({ message: 'User updated successfully.' });
    }
  );
});

app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting user:', err.message);
      return res.status(500).json({ message: 'Failed to delete user.' });
    } else if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ message: 'User deleted successfully.' });
  });
});
// Edited: Verified WebSocket initialization and notifications logic
initSocket(http);

app.post('/api/admin/notification', (req, res) => {
  const { user_id, message } = req.body;

  db.run(
    `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
    [user_id, message],
    (err) => {
      if (err) return res.status(500).json({ message: 'Failed to send notification.' });

      notifyUserQueueUpdate(user_id, message); // Emit WebSocket event for user notification
      res.status(200).json({ message: 'Notification sent successfully.' });
    }
  );
});



app.post('/api/admin/system-notification', (req, res) => {
  const { message } = req.body;

  db.run(
    `INSERT INTO notifications (user_id, message) VALUES (NULL, ?)` /* NULL for system-wide */,
    [message],
    (err) => {
      if (err) return res.status(500).json({ message: 'Failed to send system-wide notification.' });

      notifyQueueUpdate(); // WebSocket event for all users
      res.status(200).json({ message: 'System-wide notification sent successfully.' });
    }
  );
});


// Trigger automatic notifications on transaction updates
app.post('/api/transactions/update', (req, res) => {
  const { transaction_id, status } = req.body;

  db.run(
    `UPDATE transactions SET status = ? WHERE transaction_id = ?`,
    [status, transaction_id],
    function (err) {
      if (err) {
        console.error('Error updating transaction:', err.message);
        return res.status(500).json({ message: 'Failed to update transaction.' });
      }

      db.get(
        `SELECT * FROM transactions WHERE transaction_id = ?`,
        [transaction_id],
        (err, transaction) => {
          if (err || !transaction) {
            console.error('Error fetching transaction:', err?.message || 'Transaction not found.');
            return res.status(500).json({ message: 'Failed to fetch transaction.' });
          }

          // Notify the current user
          if (status === 'completed') {
            notifyUserQueueUpdate(transaction.user_id, `Transaction #${transaction.queue_number} has been completed.`);
          } else if (status === 'in-progress') {
            notifyUserQueueUpdate(transaction.user_id, `Your transaction #${transaction.queue_number} is now in progress.`);
          }

          // Notify the next user if the current transaction is completed
          if (status === 'completed') {
            db.get(
              `SELECT * FROM transactions WHERE status = 'waiting' ORDER BY queue_number ASC LIMIT 1`,
              (err, nextTransaction) => {
                if (!err && nextTransaction) {
                  notifyNextUser(nextTransaction.user_id, 'You are next in line. Please be prepared.');

                  // Update next transaction to 'in-progress'
                  db.run(
                    `UPDATE transactions SET status = 'in-progress' WHERE transaction_id = ?`,
                    [nextTransaction.transaction_id],
                    (err) => {
                      if (err) console.error('Error updating next transaction:', err.message);

                      // Notify the second user in queue
                      db.get(
                        `SELECT * FROM transactions WHERE status = 'waiting' ORDER BY queue_number ASC LIMIT 1 OFFSET 1`,
                        (err, secondTransaction) => {
                          if (!err && secondTransaction) {
                            notifyNextUser(secondTransaction.user_id, 'You are second in line. Please prepare.');
                          }
                        }
                      );
                    }
                  );
                }
              }
            );
          }

          res.status(200).json({ message: 'Transaction updated successfully.' });
        }
      );
    }
  );
});


// Default route (serves index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Initialize database
initializeDB();

// Initialize WebSocket server
initSocket(http);

// Server startup
const PORT = process.env.PORT || 5000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

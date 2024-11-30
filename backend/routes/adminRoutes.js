const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const TransactionModel = require('../models/transactionModel');

// Import Controllers
const { sendNotification, sendSystemNotification } = require('../controllers/adminController');

// User Management
router.post('/users', (req, res) => {
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;
  db.run(
    `INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [first_name, last_name, address, zip_code, contact_number, email, password, role || 'user'],
    function (err) {
      if (err) {
        console.error('Error adding user:', err.message);
        res.status(500).json({ message: 'Failed to add user.' });
      } else {
        res.status(201).json({ id: this.lastID, message: 'User added successfully.' });
      }
    }
  );
});
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ message: 'Error retrieving user for update.' });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const updatedPassword = password || user.password;
    db.run(
      `UPDATE users 
       SET first_name = ?, last_name = ?, address = ?, zip_code = ?, contact_number = ?, email = ?, password = ?, role = ?
       WHERE id = ?`,
      [
        first_name || user.first_name,
        last_name || user.last_name,
        address || user.address,
        zip_code || user.zip_code,
        contact_number || user.contact_number,
        email || user.email,
        updatedPassword,
        role || user.role,
        id,
      ],
      function (err) {
        if (err) return res.status(500).json({ message: 'Error updating user.' });
        res.status(200).json({ message: 'User updated successfully.' });
      }
    );
  });
});
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to delete user.' });
    res.status(200).json({ message: 'User deleted successfully.' });
  });
});

// Queue Management
router.get('/queue', (req, res) => {
  const query = `
    SELECT 
      t.queue_number,
      t.user_id,
      s.service_name AS transaction_type,
      t.status
    FROM transactions t
    LEFT JOIN services s ON t.service_id = s.service_id
    WHERE t.status NOT IN ('completed', 'canceled')
    ORDER BY t.queue_number ASC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch the queue.' });
    }
    res.json(rows);
  });
});

router.get('/queue/completed', (req, res) => {
  db.all(
    `SELECT t.queue_number, t.user_id, s.service_name AS transaction_type, t.status, t.created_at
     FROM transactions t
     LEFT JOIN services s ON t.service_id = s.service_id
     WHERE t.status = 'completed'
     ORDER BY t.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch completed transactions.' });
      res.json(rows);
    }
  );
});



router.put('/queue/:queueNumber/:action', (req, res) => {
  const { queueNumber, action } = req.params;
  let status;

  switch (action) {
      case 'prioritize':
          status = 'in-progress';
          break;
      case 'complete':
          status = 'completed';
          break;
      case 'cancel':
          status = 'canceled';
          break;
      default:
          return res.status(400).json({ error: 'Invalid action.' });
  }

  const updateQuery = `UPDATE transactions SET status = ? WHERE queue_number = ? AND status IN ('waiting', 'in-progress')`;
  db.run(updateQuery, [status, queueNumber], function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update queue status.' });

      console.log(`Transaction with queue #${queueNumber} updated to ${status}`);

      // Fetch the current transaction details
      const fetchTransactionQuery = `SELECT user_id FROM transactions WHERE queue_number = ?`;
      db.get(fetchTransactionQuery, [queueNumber], (err, transaction) => {
          if (err || !transaction) {
              console.error('Failed to fetch transaction for notifications:', err?.message);
              return res.status(500).json({ error: 'Failed to fetch transaction for notification.' });
          }

          // Notify the user about the current status
          if (status === 'in-progress') {
              db.run(
                  `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
                  [transaction.user_id, `Your transaction #${queueNumber} is now in progress.`],
                  (notifErr) => {
                      if (notifErr) {
                          console.error('Failed to notify user:', notifErr.message);
                      } else {
                          console.log(`Notification sent to user #${transaction.user_id} for in-progress.`);
                      }
                  }
              );

              // Notify the next user in line
              const nextUserQuery = `SELECT queue_number, user_id FROM transactions WHERE status = 'waiting' ORDER BY queue_number ASC LIMIT 1`;
              db.get(nextUserQuery, [], (err, nextTransaction) => {
                  if (nextTransaction) {
                      db.run(
                          `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
                          [nextTransaction.user_id, 'You are next in line. Please be ready.'],
                          (nextNotifErr) => {
                              if (nextNotifErr) {
                                  console.error('Failed to notify the next user:', nextNotifErr.message);
                              } else {
                                  console.log(`Notification sent to user #${nextTransaction.user_id} (next in line).`);
                              }
                          }
                      );
                  }
              });
          } else if (status === 'completed') {
              // Notify the current user that their transaction is completed
              db.run(
                  `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
                  [transaction.user_id, `Transaction #${queueNumber} has been completed.`],
                  (notifErr) => {
                      if (notifErr) {
                          console.error('Failed to notify user for completed transaction:', notifErr.message);
                      } else {
                          console.log(`Notification sent to user #${transaction.user_id} for completed transaction.`);
                      }
                  }
              );

              // Move the next transaction to "in-progress" automatically
              const nextTransactionQuery = `SELECT queue_number, user_id FROM transactions WHERE status = 'waiting' ORDER BY queue_number ASC LIMIT 1`;
              db.get(nextTransactionQuery, [], (err, nextTransaction) => {
                  if (!nextTransaction) {
                      console.log('No more transactions in the waiting queue.');
                      return; // Exit if no more waiting transactions
                  }

                  db.run(
                      `UPDATE transactions SET status = 'in-progress' WHERE queue_number = ?`,
                      [nextTransaction.queue_number],
                      (updateErr) => {
                          if (updateErr) {
                              console.error('Failed to move next transaction to in-progress:', updateErr.message);
                          } else {
                              console.log(`Transaction #${nextTransaction.queue_number} moved to in-progress.`);
                          }
                      }
                  );

                  // Notify the next user that their transaction is now in progress
                  db.run(
                      `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
                      [nextTransaction.user_id, 'Your transaction is now in progress.'],
                      (nextNotifErr) => {
                          if (nextNotifErr) {
                              console.error('Failed to notify next user for in-progress:', nextNotifErr.message);
                          } else {
                              console.log(`Notification sent to user #${nextTransaction.user_id} for in-progress.`);
                          }
                      }
                  );

                  // Notify the user after the next user (if applicable)
                  const nextNextUserQuery = `SELECT user_id FROM transactions WHERE status = 'waiting' ORDER BY queue_number ASC LIMIT 1 OFFSET 1`;
                  db.get(nextNextUserQuery, [], (err, nextNextTransaction) => {
                      if (nextNextTransaction) {
                          db.run(
                              `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
                              [nextNextTransaction.user_id, 'You are next in line. Please be ready.'],
                              (nextNextNotifErr) => {
                                  if (nextNextNotifErr) {
                                      console.error(
                                          'Failed to notify the user next after the current in-progress:',
                                          nextNextNotifErr.message
                                      );
                                  } else {
                                      console.log(
                                          `Notification sent to user #${nextNextTransaction.user_id} (next after current in-progress).`
                                      );
                                  }
                              }
                          );
                      }
                  });
              });
          }

          res.status(200).json({ message: `Queue #${queueNumber} updated to ${status}.` });
      });
  });
});





// Services Management
router.get('/services', (req, res) => {
  const query = `SELECT * FROM services`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.post('/services', (req, res) => {
  const { service_name, description } = req.body;
  db.run(
    `INSERT INTO services (service_name, description) VALUES (?, ?)`,
    [service_name, description],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to add service.' });
      res.status(201).json({ message: 'Service added successfully.' });
    }
  );
});

router.put('/services/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  const { service_name, description } = req.body;
  db.run(
    `UPDATE services SET service_name = ?, description = ? WHERE service_id = ?`,
    [service_name, description, serviceId],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to update service.' });
      res.status(200).json({ message: 'Service updated successfully.' });
    }
  );
});

router.delete('/services/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  db.run('DELETE FROM services WHERE service_id = ?', [serviceId], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to delete service.' });
    res.status(200).json({ message: 'Service deleted successfully.' });
  });
});

// Transactions Management
router.post('/transactions', (req, res) => {
  const { user_id, service_id } = req.body;

  if (!user_id || !service_id) {
    return res.status(400).json({ error: 'User ID and Service ID are required.' });
  }

  // Check if user has an active transaction
  const checkTransactionQuery = `
    SELECT * FROM transactions 
    WHERE user_id = ? AND status IN ('waiting', 'in-progress')
  `;
  db.get(checkTransactionQuery, [user_id], (err, activeTransaction) => {
    if (err) {
      return res.status(500).json({ error: 'Database error while checking active transactions.' });
    }

    if (activeTransaction) {
      return res.status(400).json({
        error: 'You already have an ongoing transaction. Please complete it before starting a new one.',
      });
    }

    // Proceed to create a new transaction
    const insertTransactionQuery = `
      INSERT INTO transactions (user_id, service_id, queue_number, status)
      VALUES (?, ?, (SELECT IFNULL(MAX(queue_number), 0) + 1 FROM transactions), 'waiting')
    `;
    db.run(insertTransactionQuery, [user_id, service_id], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create transaction.' });
      }

      const getQueueNumberQuery = `
        SELECT queue_number, 
               (SELECT service_name FROM services WHERE service_id = ?) AS transaction_type 
        FROM transactions 
        WHERE transaction_id = ?
      `;
      db.get(getQueueNumberQuery, [service_id, this.lastID], (err, transaction) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch transaction details.' });
        }

        // Create a notification for the user
        const insertNotificationQuery = `
          INSERT INTO notifications (user_id, message)
          VALUES (?, 'You are now in the queue, please wait for your turn.')
        `;
        db.run(insertNotificationQuery, [user_id], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to create notification.' });
          }

          res.status(201).json({
            message: 'Transaction created successfully!',
            queue_number: transaction.queue_number,
            transaction_type: transaction.transaction_type,
          });
        });
      });
    });
  });
});


// Add the new route for updating transaction status
router.put('/transactions/:transactionId/status', (req, res) => {
  const { transactionId } = req.params;
  const { status } = req.body;

  TransactionModel.updateTransactionStatus(transactionId, status, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result);
  });
});


// GET all transactions for admin
router.get('/transactions', (req, res) => {
  TransactionModel.getQueueForAllUsers((err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve transactions.' });
    }
    res.json(transactions);
  });
});

// Notifications
router.post('/notification', sendNotification); // User-specific notifications
router.get('/notifications', (req, res) => {
  db.all(
    `SELECT * 
     FROM notifications 
     ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch notifications.' });
      res.json(rows);
    }
  );
});




module.exports = router;
const { db } = require('./database');

const TransactionModel = {
  // Create a new transaction and notify the user
  createTransaction: (transaction, callback) => {
    const insertQuery = `
      INSERT INTO transactions (user_id, service_id, status, notified)
      VALUES (?, ?, 'waiting', 0)
    `;
    db.run(insertQuery, [transaction.user_id, transaction.service_id], function (err) {
      if (err) return callback(err);

      // Notify the user they have joined the queue
      const notificationQuery = `
        INSERT INTO notifications (user_id, message)
        VALUES (?, 'You have joined the queue. Please wait for your turn.')
      `;
      db.run(notificationQuery, [transaction.user_id], (err) => {
        if (err) console.error('Failed to create notification:', err.message);
      });

      callback(null, { transaction_id: this.lastID });
    });
  },

  // Reorder the queue numbers for active transactions
  reorderQueue: (callback) => {
    const fetchQuery = `
      SELECT transaction_id 
      FROM transactions 
      WHERE status IN ('waiting', 'in-progress')
      ORDER BY created_at ASC
    `;
    db.all(fetchQuery, [], (err, rows) => {
      if (err) return callback(err);

      const updatePromises = rows.map((row, index) => {
        return new Promise((resolve, reject) => {
          const updateQuery = `
            UPDATE transactions 
            SET queue_number = ? 
            WHERE transaction_id = ?
          `;
          db.run(updateQuery, [index + 1, row.transaction_id], (updateErr) => {
            if (updateErr) return reject(updateErr);
            resolve();
          });
        });
      });

      Promise.all(updatePromises)
        .then(() => callback(null))
        .catch(callback);
    });
  },

  // Update transaction status and handle notifications
  updateTransactionStatus: (transaction_id, status, callback) => {
    const updateQuery = `
      UPDATE transactions 
      SET status = ? 
      WHERE transaction_id = ?
    `;
  
    db.run(updateQuery, [status, transaction_id], function (err) {
      if (err) return callback(err);
  
      // Fetch the updated transaction
      db.get(`SELECT * FROM transactions WHERE transaction_id = ?`, [transaction_id], (err, transaction) => {
        if (err || !transaction) return callback(err || new Error('Transaction not found.'));
  
        // Notifications logic based on status
        switch (status) {
          case 'in-progress':
            // Notify the current user
            db.run(
              `INSERT INTO notifications (user_id, message) VALUES (?, 'It is now your turn to be served.')`,
              [transaction.user_id],
              (err) => {
                if (err) console.error('Failed to notify user:', err.message);
              }
            );
            break;
  
          case 'completed':
            // Notify the user that their transaction is completed
            db.run(
              `INSERT INTO notifications (user_id, message) VALUES (?, 'Your transaction has been successfully completed.')`,
              [transaction.user_id],
              (err) => {
                if (err) console.error('Failed to notify user:', err.message);
              }
            );
  
            // Move the next transaction to 'in-progress' and notify
            db.get(
              `SELECT * FROM transactions WHERE status = 'waiting' ORDER BY queue_number ASC LIMIT 1`,
              (err, nextTransaction) => {
                if (err) {
                  console.error('Failed to fetch next transaction:', err.message);
                  return;
                }
  
                if (nextTransaction) {
                  // Update the next transaction status
                  db.run(
                    `UPDATE transactions SET status = 'in-progress' WHERE transaction_id = ?`,
                    [nextTransaction.transaction_id],
                    (updateErr) => {
                      if (updateErr) console.error('Failed to update next transaction:', updateErr.message);
                    }
                  );
  
                  // Notify the next user
                  db.run(
                    `INSERT INTO notifications (user_id, message) VALUES (?, 'You are next. Please be prepared.')`,
                    [nextTransaction.user_id],
                    (notifyErr) => {
                      if (notifyErr) console.error('Failed to notify next user:', notifyErr.message);
                    }
                  );
                } else {
                  console.log('No next transaction in the queue.');
                }
              }
            );
            break;
  
          default:
            break;
        }
  
        callback(null, { message: 'Transaction status updated and notifications sent successfully.' });
      });
    });
  },  

  // Get the current queue for all users
  getQueueForAllUsers: (callback) => {
    const query = `
      SELECT transactions.*, users.first_name, users.last_name
      FROM transactions
      LEFT JOIN users ON transactions.user_id = users.id
      WHERE transactions.status IN ('waiting', 'in-progress')
      ORDER BY queue_number ASC
    `;
    db.all(query, [], callback);
  },

  // Get active transaction by user ID
  getActiveTransactionByUserId: (user_id, callback) => {
    const query = `
      SELECT * FROM transactions
      WHERE user_id = ? AND status IN ('waiting', 'in-progress')
      LIMIT 1
    `;
    db.get(query, [user_id], callback);
  },
};

module.exports = TransactionModel;

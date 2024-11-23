const { db } = require('./database');

const TransactionModel = {
    createTransaction: (transaction, callback) => {
        // Check if the specific user already has an active transaction
        const checkTransactionQuery = `
            SELECT * FROM transactions 
            WHERE user_id = ? AND status IN ('waiting', 'in-progress')
            LIMIT 1
        `;
        db.get(checkTransactionQuery, [transaction.user_id], (err, activeTransaction) => {
            if (err) {
                return callback(err);
            }

            if (activeTransaction) {
                return callback(new Error('You already have an ongoing transaction. Complete it to proceed.'));
            }

            // If no active transaction, proceed to create a new transaction
            const insertQuery = `
                INSERT INTO transactions (user_id, service_id, status)
                VALUES (?, ?, 'waiting')
            `;
            db.run(insertQuery, [transaction.user_id, transaction.service_id], function (err) {
                if (err) {
                    return callback(err);
                }

                // After inserting the transaction, reorder the queue
                TransactionModel.reorderQueue((reorderErr) => {
                    if (reorderErr) {
                        return callback(reorderErr);
                    }

                    // Return the new transaction details
                    callback(null, { transaction_id: this.lastID, message: 'Transaction added successfully.' });
                });
            });
        });
    },

    reorderQueue: (callback) => {
        // Fetch all `waiting` and `in-progress` transactions ordered by creation time
        const fetchQuery = `
            SELECT transaction_id 
            FROM transactions 
            WHERE status IN ('waiting', 'in-progress')
            ORDER BY created_at ASC
        `;
        db.all(fetchQuery, [], (err, rows) => {
            if (err) {
                return callback(err);
            }

            // Dynamically assign new queue numbers starting from 1
            const updateQueries = rows.map((row, index) => {
                return new Promise((resolve, reject) => {
                    const updateQuery = `
                        UPDATE transactions 
                        SET queue_number = ? 
                        WHERE transaction_id = ?
                    `;
                    db.run(updateQuery, [index + 1, row.transaction_id], (updateErr) => {
                        if (updateErr) {
                            return reject(updateErr);
                        }
                        resolve();
                    });
                });
            });

            // Execute all update queries
            Promise.all(updateQueries)
                .then(() => callback(null))
                .catch(callback);
        });
    },

    getTransactionsByUserId: (user_id, callback) => {
        const query = `
            SELECT transactions.*, services.service_name, services.description
            FROM transactions
            LEFT JOIN services ON transactions.service_id = services.service_id
            WHERE transactions.user_id = ?
            ORDER BY transactions.created_at DESC
        `;
        db.all(query, [user_id], callback);
    },

    getNextTransaction: (callback) => {
        const query = `
            SELECT transactions.*, services.service_name, services.description
            FROM transactions
            LEFT JOIN services ON transactions.service_id = services.service_id
            WHERE transactions.status = 'waiting'
            ORDER BY created_at ASC
            LIMIT 1
        `;
        db.get(query, [], callback);
    },

    updateTransactionStatus: (transaction_id, status, callback) => {
        // Update transaction status
        const updateQuery = `UPDATE transactions SET status = ? WHERE transaction_id = ?`;
        db.run(updateQuery, [status, transaction_id], (err) => {
            if (err) {
                return callback(err);
            }

            // Reorder the queue after updating the status
            TransactionModel.reorderQueue(callback);
        });
    },

    getQueueForAllUsers: (callback) => {
        // Retrieve the queue for all users to dynamically update the queue UI
        const query = `
            SELECT transactions.*, users.first_name, users.last_name
            FROM transactions
            LEFT JOIN users ON transactions.user_id = users.id
            WHERE transactions.status IN ('waiting', 'in-progress')
            ORDER BY queue_number ASC
        `;
        db.all(query, [], callback);
    },

    getActiveTransactionByUserId: (user_id, callback) => {
        // Check if a user has any active transaction
        const query = `
            SELECT * FROM transactions
            WHERE user_id = ? AND status IN ('waiting', 'in-progress')
            LIMIT 1
        `;
        db.get(query, [user_id], callback);
    }
};

module.exports = TransactionModel;

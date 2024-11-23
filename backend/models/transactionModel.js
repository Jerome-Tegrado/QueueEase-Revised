const { db } = require('./database');

const TransactionModel = {
    createTransaction: (transaction, callback) => {
        const { user_id, service_id } = transaction;

        // Check if the specific user already has an active transaction
        const checkTransactionQuery = `
            SELECT * FROM transactions 
            WHERE user_id = ? AND status IN ('waiting', 'in-progress')
            LIMIT 1
        `;
        db.get(checkTransactionQuery, [user_id], (err, activeTransaction) => {
            if (err) {
                return callback(err);
            }

            if (activeTransaction) {
                return callback(new Error('You already have an ongoing transaction.'));
            }

            // Determine the next queue number for 'waiting' transactions
            const getMaxQueueNumberQuery = `
                SELECT IFNULL(MAX(queue_number), 0) + 1 AS next_queue
                FROM transactions
                WHERE status = 'waiting'
            `;
            db.get(getMaxQueueNumberQuery, [], (err, row) => {
                if (err) {
                    return callback(err);
                }

                const nextQueueNumber = row.next_queue;

                // Insert the new transaction
                const insertQuery = `
                    INSERT INTO transactions (user_id, service_id, queue_number, status)
                    VALUES (?, ?, ?, 'waiting')
                `;
                db.run(insertQuery, [user_id, service_id, nextQueueNumber], function (err) {
                    if (err) {
                        return callback(err);
                    }

                    // Return the last inserted ID and the queue number
                    callback(null, { lastID: this.lastID, queue_number: nextQueueNumber });
                });
            });
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
            ORDER BY queue_number ASC
            LIMIT 1
        `;
        db.get(query, [], callback);
    },

    updateTransactionStatus: (transaction_id, status, callback) => {
        const query = `UPDATE transactions SET status = ? WHERE transaction_id = ?`;
        db.run(query, [status, transaction_id], callback);
    },

    reassignQueueNumbers: (callback) => {
        // Reassign queue numbers for all 'waiting' transactions dynamically
        const query = `
            WITH RankedTransactions AS (
                SELECT transaction_id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS new_queue_number
                FROM transactions
                WHERE status = 'waiting'
            )
            UPDATE transactions
            SET queue_number = (
                SELECT new_queue_number
                FROM RankedTransactions
                WHERE transactions.transaction_id = RankedTransactions.transaction_id
            )
            WHERE status = 'waiting'
        `;
        db.run(query, [], (err) => {
            if (err) {
                return callback(err);
            }
            callback(null); // Reassignment successful
        });
    },

    getUserQueueNumber: (user_id, callback) => {
        const query = `
            SELECT queue_number
            FROM transactions
            WHERE user_id = ? AND status = 'waiting'
            LIMIT 1
        `;
        db.get(query, [user_id], callback);
    }
};

module.exports = TransactionModel;

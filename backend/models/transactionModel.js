const { db } = require('./database');

const TransactionModel = {
    createTransaction: (transaction, callback) => {
        // First, get the current maximum queue number
        const getMaxQueueNumberQuery = `SELECT MAX(queue_number) AS max_queue_number FROM transactions`;
        db.get(getMaxQueueNumberQuery, [], (err, row) => {
            if (err) {
                return callback(err);
            }

            // Determine the next queue number
            const nextQueueNumber = (row.max_queue_number || 0) + 1;

            // Insert the new transaction with the next queue number
            const insertQuery = `
                INSERT INTO transactions (user_id, service_id, queue_number, status)
                VALUES (?, ?, ?, ?)
            `;
            db.run(insertQuery, [
                transaction.user_id,
                transaction.service_id,
                nextQueueNumber,
                transaction.status || 'waiting'
            ], callback);
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
            ORDER BY transactions.created_at ASC
            LIMIT 1
        `;
        db.get(query, [], callback);
    },

    updateTransactionStatus: (transaction_id, status, callback) => {
        const query = `UPDATE transactions SET status = ? WHERE transaction_id = ?`;
        db.run(query, [status, transaction_id], callback);
    }
};

module.exports = TransactionModel;

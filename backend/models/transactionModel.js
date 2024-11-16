const { db } = require('./database');

const TransactionModel = {
    createTransaction: (transaction, callback) => {
        const query = `
            INSERT INTO transactions (user_id, transaction_type, queue_number, status)
            VALUES (?, ?, ?, ?)
        `;
        db.run(query, [
            transaction.user_id,
            transaction.transaction_type,
            transaction.queue_number,
            transaction.status || 'waiting'
        ], callback);
    },

    getTransactionsByUserId: (user_id, callback) => {
        const query = `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`;
        db.all(query, [user_id], callback);
    },

    updateTransactionStatus: (transaction_id, status, callback) => {
        const query = `UPDATE transactions SET status = ? WHERE transaction_id = ?`;
        db.run(query, [status, transaction_id], callback);
    }
};

module.exports = TransactionModel;

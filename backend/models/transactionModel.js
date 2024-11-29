const { db } = require('./database');

const TransactionModel = {
    createTransaction: (transaction, callback) => {
        const checkTransactionQuery = `
            SELECT * FROM transactions 
            WHERE user_id = ? AND status IN ('waiting', 'in-progress')
            LIMIT 1
        `;
        db.get(checkTransactionQuery, [transaction.user_id], (err, activeTransaction) => {
            if (err) return callback(err);

            if (activeTransaction) {
                return callback(new Error('You already have an ongoing transaction. Complete it to proceed.'));
            }

            const insertQuery = `
                INSERT INTO transactions (user_id, service_id, status)
                VALUES (?, ?, 'waiting')
            `;
            db.run(insertQuery, [transaction.user_id, transaction.service_id], function (err) {
                if (err) return callback(err);

                TransactionModel.reorderQueue((reorderErr) => {
                    if (reorderErr) return callback(reorderErr);

                    callback(null, { transaction_id: this.lastID, message: 'Transaction added successfully.' });
                });
            });
        });
    },

    reorderQueue: (callback) => {
        const fetchQuery = `
            SELECT transaction_id 
            FROM transactions 
            WHERE status IN ('waiting', 'in-progress')
            ORDER BY created_at ASC
        `;
        db.all(fetchQuery, [], (err, rows) => {
            if (err) return callback(err);

            const updateQueries = rows.map((row, index) => {
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

            Promise.all(updateQueries)
                .then(() => callback(null))
                .catch(callback);
        });
    },

    updateTransactionStatus: async (transaction_id, status, callback) => {
        try {
            // Update the current transaction status
            const updateQuery = `UPDATE transactions SET status = ? WHERE transaction_id = ?`;
            await db.run(updateQuery, [status, transaction_id]);
    
            // Fetch the updated transaction details
            const transaction = await db.get(`SELECT * FROM transactions WHERE transaction_id = ?`, [transaction_id]);
    
            if (!transaction) return callback(new Error('Transaction not found.'));
    
            // Notify the current user based on the status
            if (status === 'in-progress') {
                // Notify the current user it is their turn
                await db.run(`INSERT INTO notifications (user_id, message) VALUES (?, ?)`, [
                    transaction.user_id,
                    'It is now your turn to be served.',
                ]);
    
                // Notify the next user that they are next
                const nextTransaction = await db.get(
                    `SELECT * FROM transactions WHERE status = 'waiting' ORDER BY queue_number ASC LIMIT 1`
                );
    
                if (nextTransaction) {
                    await db.run(`INSERT INTO notifications (user_id, message) VALUES (?, ?)`, [
                        nextTransaction.user_id,
                        'You are next. Please be prepared.',
                    ]);
                }
            } else if (status === 'completed') {
                // Notify the current user their transaction is completed
                await db.run(`INSERT INTO notifications (user_id, message) VALUES (?, ?)`, [
                    transaction.user_id,
                    'Your transaction has been successfully completed.',
                ]);
    
                // Move the next user to "in-progress"
                const nextTransaction = await db.get(
                    `SELECT * FROM transactions WHERE status = 'waiting' ORDER BY queue_number ASC LIMIT 1`
                );
    
                if (nextTransaction) {
                    await db.run(`UPDATE transactions SET status = 'in-progress' WHERE transaction_id = ?`, [
                        nextTransaction.transaction_id,
                    ]);
    
                    // Notify the next user it's their turn
                    await db.run(`INSERT INTO notifications (user_id, message) VALUES (?, ?)`, [
                        nextTransaction.user_id,
                        'It is now your turn to be served.',
                    ]);
                }
            }
    
            callback(null, { message: 'Transaction status updated and notifications sent successfully.' });
        } catch (error) {
            callback(error);
        }
    },

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

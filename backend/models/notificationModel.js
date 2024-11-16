const { db } = require('./database');

const NotificationModel = {
    createNotification: (notification, callback) => {
        const query = `
            INSERT INTO notifications (user_id, message)
            VALUES (?, ?)
        `;
        db.run(query, [notification.user_id, notification.message], callback);
    },

    getNotificationsByUserId: (user_id, callback) => {
        const query = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`;
        db.all(query, [user_id], callback);
    }
};

module.exports = NotificationModel;

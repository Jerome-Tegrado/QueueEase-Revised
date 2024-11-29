const { db } = require('./database');

const NotificationModel = {
    // Create a new notification for a specific user
    createNotification: (notification, callback) => {
        const query = `
            INSERT INTO notifications (user_id, message)
            VALUES (?, ?)
        `;
        db.run(query, [notification.user_id, notification.message], callback);
    },

    // Fetch all notifications for a specific user, including system-wide notifications
    getNotificationsByUserId: (user_id, callback) => {
        const query = `
            SELECT * 
            FROM notifications 
            WHERE user_id = ? OR user_id IS NULL 
            ORDER BY created_at DESC
        `;
        db.all(query, [user_id], callback);
    },

    // Optional: Update notification status (e.g., mark as read/unread)
    updateNotificationStatus: (notification_id, status, callback) => {
        const query = `
            UPDATE notifications 
            SET status = ? 
            WHERE notification_id = ?
        `;
        db.run(query, [status, notification_id], callback);
    },

    // Optional: Delete a specific notification by ID
    deleteNotification: (notification_id, callback) => {
        const query = `
            DELETE FROM notifications 
            WHERE notification_id = ?
        `;
        db.run(query, [notification_id], callback);
    },

    // Optional: Delete all notifications for a user (e.g., when a user deletes their account)
    deleteNotificationsByUserId: (user_id, callback) => {
        const query = `
            DELETE FROM notifications 
            WHERE user_id = ?
        `;
        db.run(query, [user_id], callback);
    },

    // Notify a specific user about a queue update
    notifyUserQueueUpdate: (user_id, message, callback) => {
        const query = `
            INSERT INTO notifications (user_id, message)
            VALUES (?, ?)
        `;
        db.run(query, [user_id, message], callback);
    },

    // Notify all users about a system-wide message
    notifySystemWideUpdate: (message, callback) => {
        const query = `
            INSERT INTO notifications (user_id, message)
            VALUES (NULL, ?)
        `;
        db.run(query, [message], callback);
    }
};

module.exports = NotificationModel;

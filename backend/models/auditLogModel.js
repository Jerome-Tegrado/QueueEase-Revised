const { db } = require('./database');

const AuditLogModel = {
    createLog: (log, callback) => {
        const query = `
            INSERT INTO audit_logs (admin_id, action)
            VALUES (?, ?)
        `;
        db.run(query, [log.admin_id, log.action], callback);
    },

    getLogsByAdminId: (admin_id, callback) => {
        const query = `SELECT * FROM audit_logs WHERE admin_id = ? ORDER BY timestamp DESC`;
        db.all(query, [admin_id], callback);
    }
};

module.exports = AuditLogModel;

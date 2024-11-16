const { db } = require('./database');

const UserModel = {
    createUser: (user, callback) => {
        const query = `
            INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(query, [
            user.first_name,
            user.last_name,
            user.address,
            user.zip_code,
            user.contact_number,
            user.email,
            user.password,
            user.role || 'user'
        ], callback);
    },

    getUserByEmail: (email, callback) => {
        const query = `SELECT * FROM users WHERE email = ?`;
        db.get(query, [email], callback);
    },

    getAllUsers: (callback) => {
        const query = `SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC`;
        db.all(query, [], callback);
    }
};

module.exports = UserModel;

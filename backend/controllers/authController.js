const bcrypt = require('bcrypt');
const { db } = require('../models/database');

exports.registerUser = (req, res) => {
    const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).send('Error hashing password.');

        const query = `
            INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(query, [first_name, last_name, address, zip_code, contact_number, email, hash, role || 'user'], function(err) {
            if (err) return res.status(400).send('Error registering user.');
            res.status(201).json({ user_id: this.lastID }); // Respond with the user ID
        });
    });
};

exports.loginUser = (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], (err, user) => {
        if (err) return res.status(500).json({ message: 'Internal server error.' });

        if (!user) return res.status(401).json({ message: 'Account not created.', redirect: '/register.html' });

        // Compare hashed passwords
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err || !isMatch) return res.status(401).json({ message: 'Invalid password.' });

            // Determine the role and respond
            if (user.role === 'admin') {
                res.status(200).json({ message: 'Welcome, Admin!', role: 'admin', redirect: '/admin-dashboard.html' });
            } else if (user.role === 'user') {
                res.status(200).json({ message: 'Welcome, User!', role: 'user', redirect: '/user-dashboard.html' });
            } else {
                res.status(403).json({ message: 'Invalid role.' });
            }
        });
    });
};

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../models/database');

exports.registerUser = (req, res) => {
    const { first_name, last_name, address, zip_code, contact_number, email, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).send('Error hashing password.');

        const query = `
            INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(query, [first_name, last_name, address, zip_code, contact_number, email, hash], (err) => {
            if (err) return res.status(400).send('Error registering user.');
            res.status(201).send('User registered successfully.');
        });
    });
};

exports.loginUser = (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], (err, user) => {
        if (err || !user) return res.status(400).send('Invalid email or password.');

        // Compare passwords directly (since you're not hashing)
        if (password !== user.password) {
            return res.status(400).send('Invalid email or password.');
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token });
    });
};

const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const { db, initializeDB } = require('./models/database'); // Correct import of db and initializeDB
const path = require('path');
const { loginUser, registerUser } = require('./controllers/authController'); // Import the loginUser and registerUser functions

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Login route for handling login logic
app.post('/user/login', loginUser); // Use the loginUser function

// Services route
app.get('/api/services', (req, res) => {
    const query = `SELECT * FROM services`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Registration Route
app.post('/api/register', (req, res) => {
    const { first_name, last_name, address, zip_code, contact_number, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const query = `
        INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        query,
        [first_name, last_name, address, zip_code, contact_number, email, password],
        (err) => {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ message: 'Email already exists.' });
                }
                console.error('Database error:', err.message);
                return res.status(500).json({ message: 'Internal server error.' });
            }
            res.status(201).json({ message: 'User registered successfully!' });
        }
    );
});

// User Management Routes (for Admins)
app.get('/api/admin/users', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            return res.status(500).json({ message: 'Failed to fetch users.' });
        }
        res.status(200).json(rows);
    });
});

app.post('/api/admin/users', (req, res) => {
    const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

    db.run(
        `INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

        [first_name, last_name, address, zip_code, contact_number, email, password, role || 'user'],
        function (err) {
            if (err) {
                console.error('Error adding user:', err.message);
                return res.status(500).json({ message: 'Failed to add user.' });
            }
            res.status(201).json({ id: this.lastID, message: 'User added successfully.' });
        }
    );
});

app.put('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

    db.run(
        `UPDATE users SET first_name = ?, last_name = ?, address = ?, zip_code = ?, contact_number = ?, email = ?, password = ?, role = ?
        WHERE id = ?`,
        [first_name, last_name, address, zip_code, contact_number, email, password, role, id],
        function (err) {
            if (err) {
                console.error('Error updating user:', err.message);
                return res.status(500).json({ message: 'Failed to update user.' });
            } else if (this.changes === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }
            res.status(200).json({ message: 'User updated successfully.' });
        }
    );
});

app.delete('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
        if (err) {
            console.error('Error deleting user:', err.message);
            return res.status(500).json({ message: 'Failed to delete user.' });
        } else if (this.changes === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ message: 'User deleted successfully.' });
    });
});

// Default route (serves index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Initialize database
initializeDB();

// Server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
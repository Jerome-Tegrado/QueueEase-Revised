const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const { db, initializeDB } = require('./models/database'); // Correct import of db and initializeDB
const path = require('path');

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

// Initialize database
initializeDB();

// Default route (serves index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Login route for handling login logic
app.post('/user/login', (req, res) => {
    const { email, password } = req.body;

    // Query the database for the user
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('Error querying database:', err.message);
            return res.status(500).send({ message: 'Internal server error.' });
        }

        if (!user) {
            // Redirect to register.html if the account does not exist
            return res.status(401).sendFile(path.join(__dirname, '../frontend/register.html'));
        }

        // Check password
        if (password !== user.password) {
            // Respond with an error message for invalid password
            return res.status(401).send('Invalid password.');
        }

        // Serve appropriate dashboard based on role
        if (user.role === 'admin') {
            res.status(200).sendFile(path.join(__dirname, '../frontend/admin-dashboard.html'));
        } else if (user.role === 'user') {
            res.status(200).sendFile(path.join(__dirname, '../frontend/user-dashboard.html'));
        } else {
            res.status(403).send('Invalid role.');
        }
    });
});


// Server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

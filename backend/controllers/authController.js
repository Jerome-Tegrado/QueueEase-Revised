const { db } = require('../models/database');

// Register User
exports.registerUser = (req, res) => {
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }

  const query = `
    INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(
    query,
    [first_name.trim(), last_name.trim(), address?.trim() || null, zip_code?.trim() || null, contact_number?.trim() || null, email.trim(), password.trim(), role || 'user'],
    function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ message: 'Email already exists.' });
        }
        console.error('Error registering user:', err.message);
        return res.status(500).json({ message: 'Error registering user.' });
      }
      res.status(201).json({ user_id: this.lastID, message: 'User registered successfully!' });
    }
  );
};

// Login User
exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;
  db.get(query, [email.trim(), password.trim()], (err, user) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Redirect based on user role
    const response = {
      message: user.role === 'admin' ? 'Welcome, Admin!' : 'Welcome, User!',
      redirect: user.role === 'admin' ? '/admin-dashboard.html' : '/user-dashboard.html',
      user: { id: user.id, email: user.email, role: user.role },
    };

    return res.status(200).json(response);
  });
};

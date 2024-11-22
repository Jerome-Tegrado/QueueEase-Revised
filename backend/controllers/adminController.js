const { db } = require('../models/database');

// User Management
exports.getAllUsers = (req, res) => {
  db.all('SELECT * FROM users ORDER BY id ASC', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Internal server error.' });
    res.json(rows);
  });
};

// Queue Management
exports.getQueue = (req, res) => {
  db.all('SELECT * FROM transactions WHERE status NOT IN ("completed", "canceled") ORDER BY queue_number ASC', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch queue.' });
    res.json(rows);
  });
};

exports.getCurrentServingQueue = (req, res) => {
  db.get(
    'SELECT queue_number FROM transactions WHERE status = "waiting" ORDER BY queue_number ASC LIMIT 1',
    (err, row) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch current queue.' });
      res.json(row || { queue_number: 'None' });
    }
  );
};

exports.updateQueueStatus = (req, res) => {
  const { queueNumber, action } = req.params;
  let status;
  switch (action) {
    case 'prioritize':
      status = 'in-progress';
      break;
    case 'complete':
      status = 'completed';
      break;
    case 'cancel':
      status = 'canceled';
      break;
    default:
      return res.status(400).json({ message: 'Invalid action.' });
  }
  db.run(
    `UPDATE transactions SET status = ? WHERE queue_number = ?`,
    [status, queueNumber],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to update queue.' });

      // Reassign queue numbers after one completes
      if (status === 'completed') {
        const reassignQueueQuery = `
          UPDATE transactions
          SET queue_number = queue_number - 1
          WHERE queue_number > ?
          AND status IN ('waiting', 'in-progress')
        `;
        db.run(reassignQueueQuery, [queueNumber], function (err) {
          if (err) {
            return res.status(500).json({ message: 'Failed to reassign queue numbers.' });
          }
          res.status(200).json({ message: `Queue #${queueNumber} updated to ${status}.` });
        });
      } else {
        res.status(200).json({ message: `Queue #${queueNumber} updated to ${status}.` });
      }
    }
  );
};

// Service Management
exports.getAllServices = (req, res) => {
  db.all('SELECT * FROM services ORDER BY service_id ASC', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch services.' });
    res.json(rows);
  });
};

exports.addService = (req, res) => {
  const { service_name, description } = req.body;
  db.run(
    `INSERT INTO services (service_name, description) VALUES (?, ?)`,
    [service_name, description],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to add service.' });
      res.status(201).json({ service_id: this.lastID, message: 'Service added successfully.' });
    }
  );
};

exports.updateService = (req, res) => {
  const { serviceId } = req.params;
  const { service_name, description } = req.body;
  db.run(
    `UPDATE services SET service_name = ?, description = ? WHERE service_id = ?`,
    [service_name, description, serviceId],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to update service.' });
      res.status(200).json({ message: 'Service updated successfully.' });
    }
  );
};

exports.deleteService = (req, res) => {
  const { serviceId } = req.params;
  db.run('DELETE FROM services WHERE service_id = ?', [serviceId], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to delete service.' });
    res.status(200).json({ message: 'Service deleted successfully.' });
  });
};

// Transactions Management
exports.addTransaction = (req, res) => {
  const { user_id, service_id } = req.body;

  if (!user_id || !service_id) {
    return res.status(400).json({ error: 'User ID and Service ID are required.' });
  }

  // Check if the specific user has an active transaction
  const checkTransactionQuery = `
    SELECT * FROM transactions 
    WHERE user_id = ? AND status IN ('waiting', 'in-progress')
    LIMIT 1
  `;
  db.get(checkTransactionQuery, [user_id], (err, activeTransaction) => {
    if (err) {
      return res.status(500).json({ error: 'Database error while checking active transactions.' });
    }

    if (activeTransaction) {
      return res.status(400).json({
        error: 'You already have an ongoing transaction. Please complete it before starting a new one.',
      });
    }

    // Proceed to create a new transaction
    const insertTransactionQuery = `
      INSERT INTO transactions (user_id, service_id, queue_number, status)
      VALUES (?, ?, (SELECT IFNULL(MAX(queue_number), 0) + 1 FROM transactions), 'waiting')
    `;
    db.run(insertTransactionQuery, [user_id, service_id], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create transaction.' });
      }

      const getQueueNumberQuery = `
        SELECT queue_number, 
               (SELECT service_name FROM services WHERE service_id = ?) AS transaction_type 
        FROM transactions 
        WHERE transaction_id = ?
      `;
      db.get(getQueueNumberQuery, [service_id, this.lastID], (err, transaction) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch transaction details.' });
        }

        res.status(201).json({
          message: 'Transaction created successfully!',
          queue_number: transaction.queue_number,
          transaction_type: transaction.transaction_type,
        });
      });
    });
  });
};




// Notifications
exports.sendNotification = (req, res) => {
  const { user_id, message } = req.body;
  db.run(
    `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
    [user_id, message],
    (err) => {
      if (err) return res.status(500).json({ message: 'Failed to send notification.' });
      res.json({ message: 'Notification sent successfully.' });
    }
  );
};
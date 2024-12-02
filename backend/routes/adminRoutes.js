const express = require("express");
const router = express.Router();
const { db } = require("../models/database");
const TransactionModel = require("../models/transactionModel");
const { notifyNextUser } = require("../controllers/adminController"); // Import notification function
const {
	sendNotification,
	sendSystemNotification,
} = require("../controllers/adminController");

// Notify the next user manually
router.post("/queue/:queueNumber/notify-next", (req, res) => {
	const { queueNumber } = req.params;

	const nextUserQuery = `
    SELECT queue_number, user_id
    FROM transactions
    WHERE status = 'waiting' AND queue_number > ?
    ORDER BY queue_number ASC
    LIMIT 1
  `;
	db.get(nextUserQuery, [queueNumber], (err, nextTransaction) => {
		if (err) {
			console.error("Failed to fetch next user:", err.message);
			return res.status(500).json({ message: "Failed to fetch next user." });
		}

		if (nextTransaction) {
      const dynamicMessage = `You are next in line. Please be prepared for queue #${queueNumber}.`;

			// Insert notification in the database
			const notificationQuery = `
        INSERT INTO notifications (user_id, message)
        VALUES (?, ?)
      `;
			db.run(notificationQuery, [nextTransaction.user_id, dynamicMessage], (notifErr) => {
				if (notifErr) {
					console.error("Failed to notify next user:", notifErr.message);
					return res
						.status(500)
						.json({ message: "Failed to notify next user." });
				}

        // Fetch the user's email and first name from the database
        const userEmailQuery = `SELECT email, first_name FROM users WHERE id = ?`;
				db.get(userEmailQuery, [nextTransaction.user_id], (userErr, user) => {
          console.log("Fetched User:", user); // Log the user details
					if (userErr || !user) {
						console.error(
							"Failed to fetch user details:",
							userErr?.message || "User not found."
						);
						return res
							.status(500)
							.json({ message: "Failed to fetch user details." });
					}

					// Send the response with the email, first_name, and dynamic message
					res.status(200).json({
						message: `Notified user #${nextTransaction.user_id} as next in line.`,
						email: user.email, // Send the user's email in the response
            firstName: user.first_name, // Send the user's first name in the response
						dynamicMessage: `You are next in line. Please be prepared for queue #${queueNumber}.` // Send the dynamic message in the response
					});
				});
			});
		} else {
			res.status(404).json({ message: "No next user in queue." });
		}
	});
});

// User Management
router.post("/users", (req, res) => {
	const {
		first_name,
		last_name,
		address,
		zip_code,
		contact_number,
		email,
		password,
		role,
	} = req.body;
	const insertUserQuery = `
    INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
	db.run(
		insertUserQuery,
		[
			first_name,
			last_name,
			address,
			zip_code,
			contact_number,
			email,
			password,
			role || "user",
		],
		function (err) {
			if (err) {
				console.error("Error adding user:", err.message);
				return res.status(500).json({ message: "Failed to add user." });
			}
			res
				.status(201)
				.json({ id: this.lastID, message: "User added successfully." });
		}
	);
});

router.put("/users/:id", (req, res) => {
	const { id } = req.params;
	const {
		first_name,
		last_name,
		address,
		zip_code,
		contact_number,
		email,
		password,
		role,
	} = req.body;

	db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
		if (err)
			return res
				.status(500)
				.json({ message: "Error retrieving user for update." });
		if (!user) return res.status(404).json({ message: "User not found." });

		const updatedPassword = password || user.password;
		const updateUserQuery = `
      UPDATE users 
      SET first_name = ?, last_name = ?, address = ?, zip_code = ?, contact_number = ?, email = ?, password = ?, role = ?
      WHERE id = ?
    `;
		db.run(
			updateUserQuery,
			[
				first_name || user.first_name,
				last_name || user.last_name,
				address || user.address,
				zip_code || user.zip_code,
				contact_number || user.contact_number,
				email || user.email,
				updatedPassword,
				role || user.role,
				id,
			],
			function (err) {
				if (err)
					return res.status(500).json({ message: "Error updating user." });
				res.status(200).json({ message: "User updated successfully." });
			}
		);
	});
});

router.delete("/users/:id", (req, res) => {
	const { id } = req.params;

	db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
		if (err) return res.status(500).json({ message: "Failed to delete user." });
		res.status(200).json({ message: "User deleted successfully." });
	});
});

// Queue Management
router.get("/queue", (req, res) => {
	const fetchQueueQuery = `
    SELECT 
      t.queue_number,
      t.user_id,
      s.service_name AS transaction_type,
      t.status
    FROM transactions t
    LEFT JOIN services s ON t.service_id = s.service_id
    WHERE t.status NOT IN ('completed', 'canceled')
    ORDER BY t.queue_number ASC
  `;
	db.all(fetchQueueQuery, [], (err, rows) => {
		if (err) {
			return res.status(500).json({ error: "Failed to fetch the queue." });
		}
		res.json(rows);
	});
});

router.put("/queue/:queueNumber/:action", (req, res) => {
	const { queueNumber, action } = req.params;
	let status;

	switch (action) {
		case "prioritize":
			status = "in-progress";
			break;
		case "complete":
			status = "completed";
			break;
		case "cancel":
			status = "canceled";
			break;
		default:
			return res.status(400).json({ error: "Invalid action." });
	}

	const updateQueueQuery = `
    UPDATE transactions 
    SET status = ? 
    WHERE queue_number = ? AND status IN ('waiting', 'in-progress')
  `;
	db.run(updateQueueQuery, [status, queueNumber], function (err) {
		if (err)
			return res.status(500).json({ error: "Failed to update queue status." });

		const fetchTransactionQuery = `SELECT user_id FROM transactions WHERE queue_number = ?`;
		db.get(fetchTransactionQuery, [queueNumber], (err, transaction) => {
			if (err || !transaction) {
				return res
					.status(500)
					.json({ error: "Failed to fetch transaction for notification." });
			}

			// Dynamically generate the message based on the status
			const message =
				status === "in-progress"
					? `Your transaction #${queueNumber} is now in progress.`
					: status === "completed"
					? `Transaction #${queueNumber} has been completed.`
					: `Transaction #${queueNumber} has been canceled.`;

			const insertNotificationQuery = `
        INSERT INTO notifications (user_id, message)
        VALUES (?, ?)
      `;
			db.run(
				insertNotificationQuery,
				[transaction.user_id, message],
				(notifErr) => {
					if (notifErr)
						console.error("Failed to notify user:", notifErr.message);

        // Fetch the user's email and first name from the database
        const userEmailQuery = `SELECT email, first_name FROM users WHERE id = ?`;
					db.get(userEmailQuery, [transaction.user_id], (userErr, user) => {
						if (userErr || !user) {
							console.error(
								"Failed to fetch user details:",
								userErr?.message || "User not found."
							);
							return res
								.status(500)
								.json({ message: "Failed to fetch user details." });
						}

	          // Send the response with the email, first_name, and dynamic message
						res.status(200).json({
							message: `Queue #${queueNumber} updated to ${status}.`,
							email: user.email, // Pass the email
              firstName: user.first_name, // Pass the first name
							dynamicMessage: message // Pass the dynamic message
						});
					});
				}
			);
		});
	});
});

// EDITED: Fetch completed transactions
router.get("/queue/completed", (req, res) => {
	const fetchCompletedQuery = `
    SELECT 
      t.queue_number, 
      t.user_id, 
      COALESCE(s.service_name, 'Unknown Service') AS transaction_type, 
      t.status, 
      t.created_at
    FROM transactions t
    LEFT JOIN services s ON t.service_id = s.service_id
    WHERE t.status = 'completed'
    ORDER BY t.created_at DESC
  `;

	db.all(fetchCompletedQuery, [], (err, rows) => {
		if (err) {
			console.error("Error fetching completed transactions:", err.message);
			return res
				.status(500)
				.json({ message: "Failed to fetch completed transactions." });
		}
		res.json(rows);
	});
});

// ADDED: Fetch live queue
router.get("/queue/live", (req, res) => {
	const fetchQueueQuery = `
    SELECT 
      t.queue_number, 
      t.user_id, 
      COALESCE(s.service_name, 'Unknown Service') AS transaction_type, 
      t.status
    FROM transactions t
    LEFT JOIN services s ON t.service_id = s.service_id
    WHERE t.status IN ('waiting', 'in-progress')
    ORDER BY t.queue_number ASC
  `;

	db.all(fetchQueueQuery, [], (err, rows) => {
		if (err) {
			console.error("Error fetching live queue:", err.message);
			return res.status(500).json({ message: "Failed to fetch live queue." });
		}
		res.json(rows);
	});
});

// Services Management
router.get("/services", (req, res) => {
	db.all("SELECT * FROM services", [], (err, rows) => {
		if (err)
			return res.status(500).json({ error: "Failed to fetch services." });
		res.json(rows);
	});
});

router.post("/services", (req, res) => {
	const { service_name, description } = req.body;

	const insertServiceQuery = `
    INSERT INTO services (service_name, description) 
    VALUES (?, ?)
  `;
	db.run(insertServiceQuery, [service_name, description], function (err) {
		if (err) return res.status(500).json({ message: "Failed to add service." });
		res.status(201).json({ message: "Service added successfully." });
	});
});

router.delete("/services/:serviceId", (req, res) => {
	const { serviceId } = req.params;

	db.run(
		"DELETE FROM services WHERE service_id = ?",
		[serviceId],
		function (err) {
			if (err)
				return res.status(500).json({ message: "Failed to delete service." });
			res.status(200).json({ message: "Service deleted successfully." });
		}
	);
});

// Transactions Management
router.post("/transactions", (req, res) => {
	const { user_id, service_id } = req.body;

	if (!user_id || !service_id) {
		return res
			.status(400)
			.json({ error: "User ID and Service ID are required." });
	}

	const checkTransactionQuery = `
    SELECT * FROM transactions 
    WHERE user_id = ? AND status IN ('waiting', 'in-progress')
  `;
	db.get(checkTransactionQuery, [user_id], (err, activeTransaction) => {
		if (err) {
			return res
				.status(500)
				.json({ error: "Database error while checking active transactions." });
		}

		if (activeTransaction) {
			return res.status(400).json({
				error:
					"You already have an ongoing transaction. Please complete it before starting a new one.",
			});
		}

		const insertTransactionQuery = `
      INSERT INTO transactions (user_id, service_id, queue_number, status)
      VALUES (?, ?, (SELECT IFNULL(MAX(queue_number), 0) + 1 FROM transactions), 'waiting')
    `;
		db.run(insertTransactionQuery, [user_id, service_id], function (err) {
			if (err)
				return res.status(500).json({ error: "Failed to create transaction." });

			const getQueueNumberQuery = `
        SELECT queue_number, 
               (SELECT service_name FROM services WHERE service_id = ?) AS transaction_type 
        FROM transactions 
        WHERE transaction_id = ?
      `;
			db.get(
				getQueueNumberQuery,
				[service_id, this.lastID],
				(err, transaction) => {
					if (err)
						return res
							.status(500)
							.json({ error: "Failed to fetch transaction details." });

					const insertNotificationQuery = `
          INSERT INTO notifications (user_id, message)
          VALUES (?, 'You are now in the queue, please wait for your turn.')
        `;
					db.run(insertNotificationQuery, [user_id], (err) => {
						if (err)
							return res
								.status(500)
								.json({ error: "Failed to create notification." });

						       // Fetch the user's email and first name from the database
						const userEmailQuery = `SELECT email, first_name FROM users WHERE id = ?`;
						db.get(
							userEmailQuery,
							[user_id],
							(userErr, user) => {
								if (userErr || !user) {
									console.error(
										"Failed to fetch user details:",
										userErr?.message || "User not found."
									);
									return res
										.status(500)
										.json({ message: "Failed to fetch user details." });
								}

								// Dynamically create the message
								const dynamicMessage =
									"You are now in the queue, please wait for your turn.";

								  res.status(201).json({
									message: "Transaction created successfully!",
									queue_number: transaction.queue_number,
									transaction_type: transaction.transaction_type,
									email: user.email, // Send the user's email in the response
                  firstName: user.first_name, // Send the user's first name in the response
									dynamicMessage: dynamicMessage // Send the dynamic message in the response
								});
							}
						);
					});
				}
			);
		});
	});
});

// Add the new route for updating transaction status
router.put("/transactions/:transactionId/status", (req, res) => {
	const { transactionId } = req.params;
	const { status } = req.body;

	TransactionModel.updateTransactionStatus(
		transactionId,
		status,
		(err, result) => {
			if (err) return res.status(500).json({ error: err.message });
			res.status(200).json(result);
		}
	);
});

// GET all transactions for admin
router.get("/transactions", (req, res) => {
	TransactionModel.getQueueForAllUsers((err, transactions) => {
		if (err) {
			return res
				.status(500)
				.json({ error: "Failed to retrieve transactions." });
		}
		res.json(transactions);
	});
});

// Notifications
router.post("/notification", sendNotification);
router.get("/notifications", (req, res) => {
	db.all(
		`SELECT * 
     FROM notifications 
     ORDER BY created_at DESC`,
		[],
		(err, rows) => {
			if (err)
				return res
					.status(500)
					.json({ message: "Failed to fetch notifications." });
			res.json(rows);
		}
	);
});

module.exports = router;

const { Server } = require('socket.io');

let io; // WebSocket server instance

/**
 * Initialize WebSocket server
 * @param {Object} server - The HTTP server instance
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins, or specify allowed origins for security
      methods: ["GET", "POST"],
    },
  });

  io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Register user to a specific room based on user ID
    socket.on('registerUser', (userId) => {
      socket.user_id = userId;
      socket.join(userId); // Add user to a room with their user ID
      console.log(`User registered with ID: ${userId} and added to room.`);
    });

    // Handle user disconnects
    socket.on('disconnect', () => {
      console.log(`A user disconnected: ${socket.id}`);
    });
  });
}

// Edited: Simplified WebSocket notification logic
function notifyQueueUpdate() {
  if (io) {
    io.emit('queueUpdated'); // Notify all clients
    console.log('Queue updated notification sent.');
  } else {
    console.error('WebSocket server not initialized.');
  }
}

/**
 * Notify a specific user about their queue update
 * @param {String} userId - The ID of the user to notify
 * @param {Object} data - Notification data to send
 */
function notifyUserQueueUpdate(userId, data) {
  if (io) {
    io.to(userId.toString()).emit('userQueueUpdated', data);
    console.log(`Notification sent to user ID: ${userId}`);
  } else {
    console.error('WebSocket server not initialized.');
  }
}


/**
 * Broadcast an event to update a specific transaction
 * @param {Object} transaction - The transaction data to broadcast
 */
function notifyTransactionUpdate(transaction) {
  if (io) {
    io.emit('transactionUpdated', transaction); // Broadcast 'transactionUpdated' event to all clients
    console.log('Transaction update notification sent to all clients.');
  } else {
    console.error('WebSocket server is not initialized.');
  }
}

/**
 * Notify the next user in line about their queue status
 * @param {String} nextUserId - The ID of the next user
 * @param {Object} data - Notification data for the next user
 */
function notifyNextUser(nextUserId, data) {
  if (io) {
    io.to(nextUserId).emit('nextQueueNotification', data); // Notify next user
    console.log(`Next queue notification sent to user ID: ${nextUserId}`);
  } else {
    console.error('WebSocket server is not initialized.');
  }
}

/**
 * Notify a user about a system-wide message or alert
 * @param {String} userId - The ID of the user to notify, or null for all users
 * @param {Object} data - Notification data
 */
function notifySystemMessage(userId, data) {
  if (io) {
    if (userId) {
      io.to(userId).emit('systemNotification', data); // Send system notification to specific user
      console.log(`System notification sent to user ID: ${userId}`);
    } else {
      io.emit('systemNotification', data); // Broadcast to all users
      console.log('System-wide notification sent to all users.');
    }
  } else {
    console.error('WebSocket server is not initialized.');
  }
}

module.exports = {
  initSocket,
  notifyQueueUpdate,
  notifyUserQueueUpdate,
  notifyTransactionUpdate,
  notifyNextUser, // Exported for next user notifications
  notifySystemMessage, // Added function for system-wide notifications
};

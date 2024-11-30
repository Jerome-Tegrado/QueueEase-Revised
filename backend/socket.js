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

/**
 * Notify all clients about a queue update
 */
function notifyQueueUpdate() {
  if (io) {
    io.emit('queueUpdated'); // Notify all clients
    console.log('Queue updated notification sent.');
  } else {
    console.error('WebSocket server not initialized.');
  }
}

/**
 * Notify a specific user about their queue status update
 * @param {String} userId - The ID of the user to notify
 * @param {String} message - Notification message
 */
function notifyUserQueueUpdate(userId, message) {
  if (io) {
    io.to(userId.toString()).emit('userQueueUpdated', { message });
    console.log(`Notification sent to user ID: ${userId}: ${message}`);
  } else {
    console.error('WebSocket server not initialized.');
  }
}

/**
 * Notify the user whose transaction is now in-progress
 * @param {String} userId - The ID of the user
 * @param {String} transactionNumber - The transaction number
 */
function notifyInProgress(userId, transactionNumber) {
  const message = `Your transaction #${transactionNumber} is now in progress.`;
  notifyUserQueueUpdate(userId, message);
}

/**
 * Notify the user whose transaction has been completed
 * @param {String} userId - The ID of the user
 * @param {String} transactionNumber - The transaction number
 */
function notifyCompletion(userId, transactionNumber) {
  const message = `Transaction #${transactionNumber} has been completed.`;
  notifyUserQueueUpdate(userId, message);
}

/**
 * Notify the next user in line to prepare
 * @param {String} userId - The ID of the next user
 */
function notifyNextUser(userId) {
  const message = `You are next in line. Please be ready.`;
  notifyUserQueueUpdate(userId, message);
}

/**
 * Notify all users of a system-wide message or alert
 * @param {String} message - Notification message
 */
function notifySystemMessage(message) {
  if (io) {
    io.emit('systemNotification', { message }); // Broadcast to all users
    console.log(`System-wide notification sent: ${message}`);
  } else {
    console.error('WebSocket server is not initialized.');
  }
}

module.exports = {
  initSocket,
  notifyQueueUpdate,
  notifyUserQueueUpdate,
  notifyInProgress, // Notify in-progress state
  notifyCompletion, // Notify completion state
  notifyNextUser, // Notify next user
  notifySystemMessage,
};

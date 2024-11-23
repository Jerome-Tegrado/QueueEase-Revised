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

    // Store user ID on connection (if provided)
    socket.on('registerUser', (userId) => {
      socket.user_id = userId;
      console.log(`User registered with ID: ${userId}`);
    });

    // Handle user disconnects
    socket.on('disconnect', () => {
      console.log(`A user disconnected: ${socket.id}`);
    });
  });
}

/**
 * Notify all connected clients about a queue update
 */
function notifyQueueUpdate() {
  if (io) {
    io.emit('queueUpdated'); // Broadcast 'queueUpdated' event to all clients
    console.log('Queue update notification sent to all clients.');
  } else {
    console.error('WebSocket server is not initialized.');
  }
}

/**
 * Notify a specific user about their queue update
 * @param {String} userId - The ID of the user to notify
 * @param {Object} data - Additional data to send
 */
function notifyUserQueueUpdate(userId, data) {
  if (io) {
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
      (socket) => socket.user_id === userId
    );

    if (targetSocket) {
      targetSocket.emit('userQueueUpdated', data); // Send 'userQueueUpdated' event to the specific user
      console.log(`Queue update notification sent to user: ${userId}`);
    } else {
      console.warn(`No connected socket found for user: ${userId}`);
    }
  } else {
    console.error('WebSocket server is not initialized.');
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

module.exports = { initSocket, notifyQueueUpdate, notifyUserQueueUpdate, notifyTransactionUpdate };

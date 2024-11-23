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

module.exports = { initSocket, notifyQueueUpdate };

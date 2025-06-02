// This is a simple signaling server for demonstration purposes
// In production, you would run this on a separate server

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store active rooms and their participants
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  let currentRoom = null;
  let currentUserId = null;

  // Join room
  socket.on('join-room', ({ roomId, userId, userName }) => {
    console.log(`User ${userName} (${userId}) joining room ${roomId}`);
    
    // Leave previous room if any
    if (currentRoom) {
      handleUserLeaving(socket, currentRoom, currentUserId);
    }
    
    // Store current room and user info
    currentRoom = roomId;
    currentUserId = userId;
    
    // Join the room
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    
    const room = rooms.get(roomId);
    
    // Add user to room
    room.set(userId, { 
      id: userId, 
      name: userName, 
      socketId: socket.id 
    });
    
    // Get current participants (excluding the new user)
    const existingParticipants = Array.from(room.values())
      .filter(p => p.id !== userId)
      .map(p => ({
        userId: p.id,
        userName: p.name
      }));
    
    // Send existing participants to the new user
    if (existingParticipants.length > 0) {
      console.log(`Sending existing participants to ${userName}:`, existingParticipants);
      socket.emit('room-participants', existingParticipants);
    }
    
    // Notify others about the new user
    socket.to(roomId).emit('user-joined', { userId, userName });
    
    // Log room state
    console.log(`Room ${roomId} current state:`, {
      participants: Array.from(room.values()).map(p => ({
        userId: p.id,
        userName: p.name,
        socketId: p.socketId
      }))
    });
  });

  // Leave room
  socket.on('leave-room', ({ roomId, userId }) => {
    handleUserLeaving(socket, roomId, userId);
  });

  // Signal relay
  socket.on('signal', (data) => {
    const { from, to, signal } = data;
    console.log(`Relaying signal from ${from} to ${to}`, { type: signal.type });
    
    const room = rooms.get(currentRoom);
    if (!room) {
      console.log(`Room ${currentRoom} not found`);
      return;
    }
    
    const targetParticipant = room.get(to);
    if (!targetParticipant) {
      console.log(`Target participant ${to} not found in room ${currentRoom}`);
      return;
    }
    
    // Find the socket for the target participant
    const targetSocket = io.sockets.sockets.get(targetParticipant.socketId);
    if (!targetSocket) {
      console.log(`Socket not found for participant ${to}`);
      return;
    }
    
    // Emit the signal directly to the target socket
    targetSocket.emit('signal', {
      from,
      to,
      signal
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (currentRoom && currentUserId) {
      handleUserLeaving(socket, currentRoom, currentUserId);
    }
  });
  
  // Helper function to handle a user leaving
  function handleUserLeaving(socket, roomId, userId) {
    console.log(`User ${userId} leaving room ${roomId}`);
    
    // Get room
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Remove user from room
    room.delete(userId);
    
    // Notify others
    socket.to(roomId).emit('user-left', { userId });
    
    // Leave the socket room
    socket.leave(roomId);
    
    // Remove room if empty
    if (room.size === 0) {
      rooms.delete(roomId);
    }
    
    // Clear current room and user info
    if (currentRoom === roomId) {
      currentRoom = null;
      currentUserId = null;
    }
    
    // Log room state after leaving
    if (room.size > 0) {
      console.log(`Room ${roomId} state after user left:`, {
        participants: Array.from(room.values()).map(p => ({
          userId: p.id,
          userName: p.name,
          socketId: p.socketId
        }))
      });
    }
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
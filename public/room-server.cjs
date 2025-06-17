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

// Store rooms and their participants
const rooms = new Map();

// Helper function to create a new participant
const createParticipant = (id, name, socketId) => ({
  id,
  name,
  socketId,
  position: { x: 0, y: 0 }
});

// Helper function to handle user leaving
const handleUserLeaving = (socket, roomId, userId) => {
  const room = rooms.get(roomId);
  if (!room) return;

  room.delete(userId);
  
  if (room.size === 0) {
    rooms.delete(roomId);
  } else {
    // Notify others that user has left
    socket.to(roomId).emit('user-left', { userId });
  }
};

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
    
    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    
    const room = rooms.get(roomId);
    
    // Add participant to room
    room.set(userId, createParticipant(userId, userName, socket.id));
    
    // Join socket room
    socket.join(roomId);
    
    // Send current participants to new user
    socket.emit('room-participants', Array.from(room.values()).map(p => ({
      userId: p.id,
      userName: p.name,
      position: p.position
    })));
    
    // Notify others about new participant
    socket.to(roomId).emit('user-joined', {
      userId,
      userName,
      position: { x: 0, y: 0 }
    });
    
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

  // Handle position updates
  socket.on('update-position', ({ roomId, userId, position }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.get(userId);
    if (!participant) return;

    // Update participant's position
    participant.position = position;

    // Broadcast position update to all other participants in the room
    socket.to(roomId).emit('position-update', {
      userId,
      position
    });
  });

  // Handle initial positions request
  socket.on('request-initial-positions', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Collect all current positions in the room
    const positions = {};
    room.forEach((participant, userId) => {
      if (participant.position) {
        positions[userId] = participant.position;
      }
    });

    // Send all positions to the requesting socket
    socket.emit('initial-positions', positions);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (currentRoom && currentUserId) {
      handleUserLeaving(socket, currentRoom, currentUserId);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const FasahBot = require('./fasah-bot');

// Store independent engine instances for each connected user
const userEngines = new Map();

app.get('/api/health', (req, res) => {
  res.json({ status: 'Super Fasah Engine is Running 🚀', activeEngines: userEngines.size });
});

app.post('/api/start-engine', async (req, res) => {
  try {
    const { jwtToken, socketId } = req.body;
    if (!jwtToken) throw new Error("JWT Token is required.");
    if (!socketId) throw new Error("Socket ID is required.");
    
    // Clean up existing engine for this user if it exists
    if (userEngines.has(socketId)) {
      userEngines.get(socketId).stop();
    }
    
    // Create a totally isolated engine for this specific user
    const userEngine = new FasahBot();
    userEngines.set(socketId, userEngine);
    
    // Bind events only to this specific user's socket
    const userSocket = io.sockets.sockets.get(socketId);
    if (userSocket) {
      userEngine.on('login_success', () => userSocket.emit('engine_login_success'));
      userEngine.on('slot_found', (data) => userSocket.emit('engine_slot_found', data));
    }
    
    await userEngine.connect(jwtToken);
    res.json({ success: true, message: 'API Engine Connected (Isolated Session)' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Destroy engine instance when user closes the browser
    if (userEngines.has(socket.id)) {
      userEngines.get(socket.id).stop();
      userEngines.delete(socket.id);
      console.log(`Cleaned up engine for ${socket.id}`);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend booking engine running on port ${PORT}`);
});

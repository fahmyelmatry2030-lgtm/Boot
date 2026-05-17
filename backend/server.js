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
const bot = new FasahBot();

app.get('/api/health', (req, res) => {
  res.json({ status: 'Super Fasah Engine is Running 🚀' });
});

app.post('/api/start-engine', async (req, res) => {
  try {
    const { jwtToken } = req.body;
    if (!jwtToken) throw new Error("JWT Token is required.");
    
    await bot.connect(jwtToken);
    res.json({ success: true, message: 'API Engine Connected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected for real-time monitoring:', socket.id);
  
  // Listen for bot events and broadcast to the dashboard
  bot.on('login_success', () => socket.emit('engine_login_success'));
  bot.on('slot_found', (data) => socket.emit('engine_slot_found', data));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend booking engine running on port ${PORT}`);
});

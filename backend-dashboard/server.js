const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://just-arora.github.io",
    methods: ["GET", "POST"]
  }
});

let lastDataPoint = null;

/**
 * Endpoint status server
 */
app.get('/', (req, res) => {
  res.json({
    service: 'IoT Dashboard WebSocket Server',
    status: 'online',
    websocket: true,
    connectedClients: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

/**
 * Endpoint health check
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy'
  });
});

/**
 * Endpoint status websocket
 */
app.get('/ws-status', (req, res) => {
  res.json({
    websocket: 'running',
    connectedClients: io.engine.clientsCount,
    transport: ['websocket', 'polling'],
    timestamp: new Date().toISOString()
  });
});

function generateDataPoint() {
  const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);
  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const jitter = (base, delta, min, max) =>
    clamp(+(base + (Math.random() - 0.5) * 2 * delta).toFixed(1), min, max);

  const suhu = lastDataPoint ? jitter(lastDataPoint.suhu, 0.5, 22, 30) : rand(23, 27);
  const kelembapan = lastDataPoint ? jitter(lastDataPoint.kelembapan, 1.5, 40, 70) : rand(45, 60);
  const cahaya = lastDataPoint ? jitter(lastDataPoint.cahaya, 20, 0, 500) : rand(150, 350);
  const orang = Math.random() > 0.25 ? 1 : 0;

  const now = new Date();
  const label = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  lastDataPoint = { time: label, suhu, kelembapan, cahaya, orang };
  return lastDataPoint;
}

io.on('connection', (socket) => {
  console.log(`[${new Date().toLocaleTimeString()}] Dashboard terhubung: ${socket.id}`);

  const interval = setInterval(() => {
    const newData = generateDataPoint();
    socket.emit('sensor_update', newData);
  }, 2000);

  socket.on('disconnect', () => {
    console.log(`[${new Date().toLocaleTimeString()}] Dashboard terputus.`);
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});

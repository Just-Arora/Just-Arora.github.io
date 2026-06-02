const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Konfigurasi CORS agar diizinkan diakses oleh port default Vite (5173)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// State internal di server untuk melacak titik data sebelumnya (untuk efek jitter/fluktuasi halus)
let lastDataPoint = null;

// Mengadopsi algoritma fluktuasi bertahap dari kode App.jsx Anda
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

// Handler WebSocket koneksi
io.on('connection', (socket) => {
  console.log(`[${new Date().toLocaleTimeString()}] Dashboard terhubung: ${socket.id}`);

  // Kirim data baru setiap 2 detik ke client yang terhubung
  const interval = setInterval(() => {
    const newData = generateDataPoint();
    socket.emit('sensor_update', newData); // Menggunakan event 'sensor_update'
  }, 2000);

  socket.on('disconnect', () => {
    console.log(`[${new Date().toLocaleTimeString()}] Dashboard terputus.`);
    clearInterval(interval);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server Back-End IoT berjalan di http://localhost:${PORT}`);
});
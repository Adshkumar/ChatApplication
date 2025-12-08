import app from "./app.js";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const isProduction = process.env.NODE_ENV === 'production';
// Create HTTP server so socket.io can attach to it
const server = http.createServer(app);

// Initialize Socket.IO add this *
const io = new Server(server, {
  cors: {
    origin: isProduction && FRONTEND_URL 
    ? [process.env.FRONTEND_URL, 'http://localhost:5173']
     : "http://localhost:5173",
    credentials: true,
  },
  transports: ['websocket', 'polling'], 
});

// Make io accessible to routes
app.set('socketio', io);

// Track online users
let onlineUsers = new Set();

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    onlineUsers.add(userId);
    io.emit("getOnlineUsers", Array.from(onlineUsers));
  }

  socket.on("disconnect", () => {
    if (userId) {
      onlineUsers.delete(userId);
      io.emit("getOnlineUsers", Array.from(onlineUsers));
    }
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// Start server
server.listen(PORT,  () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🌐 CORS configured for: ${isProduction ? 'Production + Localhost' : FRONTEND_URL}`);
});
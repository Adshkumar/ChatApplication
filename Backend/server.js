// server.js
import app from "./app.js";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Create HTTP server so socket.io can attach to it
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        "https://chat-application-adshkumars-projects.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://chat-application-git-main-adshkumars-projects.vercel.app",
      ];
      
      // Allow ALL vercel.app domains in production
      if (isProduction && origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      // Check against specific allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      console.log("⚠️ Socket.IO CORS blocked origin:", origin);
      return callback(new Error('Not allowed by CORS'), false);
    },
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
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`🔌 Socket.IO ready: ws://localhost:${PORT}`);
});
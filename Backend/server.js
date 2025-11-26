import app from "./app.js";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server so socket.io can attach to it
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
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
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
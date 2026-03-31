// server.js
import app from "./app.js";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { createCallLog, updateCallStatus } from "./controllers/call.controller.js";
import connectDB from "./config/db.js";
import CallLog from "./models/callLog.model.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Create HTTP server so socket.io can attach to it
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        process.env.FRONTEND_URL
      ].filter(Boolean);
      
      // Allow any Vercel deployment of this project
      if (origin.includes('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      console.log("⚠️ Socket.IO CORS blocked origin:", origin);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'], 
});

app.set('socketio', io);

// Track online users: userId -> socketId
const userSocketMap = new Map();
// Store active call mappings for duration tracking
const activeCalls = new Map(); // roomId -> callLogId

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  let userId = null;
  const queryUserId = socket.handshake.query.userId;
  
  if (queryUserId) {
    userId = queryUserId.toString();
    userSocketMap.set(userId, socket.id);
    socket.join(userId);
    console.log(`🔗 User ${userId} joined room. Room list:`, socket.rooms);
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  }

  // ─── Video Call Signaling ───────────────────────────────────────────────────

  // Caller initiates a call to callee
  socket.on("call-user", async ({ toUserId, fromUser, offer, roomId }) => {
    const targetRoom = toUserId?.toString();
    console.log(`📞 Attempting call from ${fromUser?._id} to ${targetRoom}`);

    // Emit signaling immediately (Don't wait for DB if possible)
    if (targetRoom) {
      io.to(targetRoom).emit("incoming-call", { fromUser, offer, roomId });
    }

    // Log call in background
    try {
      const log = await createCallLog({
        caller: fromUser._id,
        receiver: toUserId,
        status: "missed",
        type: "video"
      });
      if (log && roomId) {
        activeCalls.set(roomId, log._id);
        console.log(`📝 Call log created: ${log._id} for room ${roomId}`);
        
        // Notify both parties to refresh history
        io.to(fromUser._id.toString()).emit("call-log-updated");
        io.to(toUserId.toString()).emit("call-log-updated");
      }
    } catch (err) {
      console.error("❌ Failed to create call log:", err.message);
    }
  });

  // Callee accepts the call
  socket.on("call-accepted", async ({ toUserId, answer, roomId }) => {
    const targetRoom = toUserId?.toString();
    console.log(`✅ call-accepted to Room: ${targetRoom}`);
    
    if (targetRoom) {
      io.to(targetRoom).emit("call-accepted", { answer, roomId, fromUserId: userId });
    }

    try {
      const callLogId = activeCalls.get(roomId);
      if (callLogId) {
        await updateCallStatus(callLogId, "ongoing");
        
        // Notify both parties to refresh history (status changed from missed to ongoing)
        const log = await CallLog.findById(callLogId);
        if (log) {
          io.to(log.caller.toString()).emit("call-log-updated");
          io.to(log.receiver.toString()).emit("call-log-updated");
        }
      }
    } catch (err) {
      console.error("❌ Failed to update call log to ongoing:", err.message);
    }
  });

  // Callee rejects the call
  socket.on("call-rejected", async ({ toUserId, roomId }) => {
    const targetRoom = toUserId?.toString();
    console.log(`❌ call-rejected to Room: ${targetRoom}`);
    
    if (targetRoom) {
      io.to(targetRoom).emit("call-rejected", { roomId });
    }

    try {
      const callLogId = activeCalls.get(roomId);
      if (callLogId) {
        await updateCallStatus(callLogId, "rejected");
        
        const log = await CallLog.findById(callLogId);
        if (log) {
          io.to(log.caller.toString()).emit("call-log-updated");
          io.to(log.receiver.toString()).emit("call-log-updated");
        }
        
        activeCalls.delete(roomId);
      }
    } catch (err) {
      console.error("❌ Failed to update call log to rejected:", err.message);
    }
  });

  // ICE candidate exchange
  socket.on("ice-candidate", ({ toUserId, candidate }) => {
    const targetRoom = toUserId?.toString();
    if (targetRoom) {
      io.to(targetRoom).emit("ice-candidate", { candidate, fromUserId: userId });
    }
  });

  // End call (both sides)
  socket.on("end-call", async ({ toUserId, roomId }) => {
    const targetRoom = toUserId?.toString();
    console.log(`📵 end-call to Room: ${targetRoom}`);
    
    const callLogId = activeCalls.get(roomId);
    if (callLogId) {
      await updateCallStatus(callLogId, "completed");
      
      const log = await CallLog.findById(callLogId);
      if (log) {
        io.to(log.caller.toString()).emit("call-log-updated");
        io.to(log.receiver.toString()).emit("call-log-updated");
      }
      
      activeCalls.delete(roomId);
    }

    if (targetRoom) {
      io.to(targetRoom).emit("call-ended", { roomId });
    }
  });

  // Typing indicators
  socket.on("typing", ({ toUserId }) => {
    const targetRoom = toUserId?.toString();
    if (targetRoom) {
      io.to(targetRoom).emit("user-typing", { fromUserId: userId });
    }
  });

  socket.on("stop-typing", ({ toUserId }) => {
    const targetRoom = toUserId?.toString();
    if (targetRoom) {
      io.to(targetRoom).emit("user-stop-typing", { fromUserId: userId });
    }
  });

  // Add a participant to an ongoing call
  socket.on("add-participant", ({ toUserId, fromUser, offer, roomId }) => {
    const targetRoom = toUserId?.toString();
    console.log(`➕ add-participant to Room: ${targetRoom}`);
    if (targetRoom) {
      io.to(targetRoom).emit("incoming-call", { fromUser, offer, roomId, isAddedToCall: true });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
    if (userId) {
      userSocketMap.delete(userId);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  connectDB();
  console.log(`🌐 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`🔌 Socket.IO ready: ws://localhost:${PORT}`);
});
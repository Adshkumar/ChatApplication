import app from "./app.js";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { createCallLog, updateCallStatus } from "./controllers/call.controller.js";
import connectDB from "./config/db.js";
import CallLog from "./models/callLog.model.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", credentials: true },
  transports: ['websocket', 'polling'],
});

const userSocketMap = new Map();
const activeCalls = new Map();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(userId);
    if (!userSocketMap.has(userId)) userSocketMap.set(userId, new Set());
    userSocketMap.get(userId).add(socket.id);
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  }

  socket.on("call-user", async (data) => {
    const { toUserId, fromUser, offer, roomId, callMode } = data;
    const type = callMode || 'audio';
    
    if (toUserId) {
        const payload = { fromUser, offer, roomId, callMode: type };
        io.to(toUserId.toString()).emit("v3-incoming-call", payload);
        io.to(toUserId.toString()).emit("incoming-call", payload);
    }

    try {
      const log = await createCallLog({
        caller: fromUser._id, receiver: toUserId, status: "missed", type: type
      });
      if (log && roomId) activeCalls.set(roomId, log._id);
      io.to(fromUser._id.toString()).emit("call-log-updated");
      io.to(toUserId.toString()).emit("call-log-updated");
    } catch (err) {}
  });

  socket.on("end-call", async ({ toUserId, roomId }) => {
    if (toUserId) io.to(toUserId.toString()).emit("call-ended", { roomId });
    const callLogId = activeCalls.get(roomId);
    if (callLogId) {
      await updateCallStatus(callLogId, "completed");
      activeCalls.delete(roomId);
    }
  });

  socket.on("call-accepted", async ({ toUserId, answer, roomId }) => {
    if (toUserId) io.to(toUserId.toString()).emit("call-accepted", { answer, roomId });
  });

  socket.on("call-rejected", async ({ toUserId, roomId }) => {
    if (toUserId) io.to(toUserId.toString()).emit("call-rejected", { roomId });
  });

  socket.on("disconnect", () => {
    if (userId && userSocketMap.has(userId)) {
      userSocketMap.get(userId).delete(socket.id);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    }
  });
});

server.listen(PORT, () => {
  connectDB();
  console.log(`✅ Production Server Ready on Port ${PORT}`);
});
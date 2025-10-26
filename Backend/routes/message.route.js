import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage, 
} from "../controllers/message.controller.js";

const router = express.Router();

// ✅ Get list of users for sidebar
router.get("/users", protectRoute, getUsersForSidebar);

// ✅ Get chat messages between logged-in user and another user
router.get("/:id", protectRoute, getMessages);

// ✅ Send a message (use POST instead of GET)
router.post("/send/:id", protectRoute, sendMessage);

export default router;

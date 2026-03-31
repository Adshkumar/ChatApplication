import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  deleteMessage,
  markMessagesAsRead,
  uploadMiddleware,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, uploadMiddleware, sendMessage);
router.put("/mark-read/:id", protectRoute, markMessagesAsRead);

router.delete("/:id", protectRoute, deleteMessage);

export default router;
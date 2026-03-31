import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getCallLogs, deleteCallLog } from "../controllers/call.controller.js";

const router = express.Router();

router.get("/logs", protectRoute, getCallLogs);
router.delete("/logs/:id", protectRoute, deleteCallLog);

export default router;

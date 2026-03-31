import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getStatuses, createStatus, deleteStatus, viewStatus } from "../controllers/status.controller.js";

const router = express.Router();

router.get("/", protectRoute, getStatuses);
router.post("/create", protectRoute, createStatus);
router.post("/view/:id", protectRoute, viewStatus);
router.delete("/delete/:id", protectRoute, deleteStatus);

export default router;

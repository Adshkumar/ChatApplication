import dotenv from "dotenv";
import connectDB from "./config/db.js";
import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";

import authRouter from "./routes/auth.route.js";
import messageRouter from "./routes/message.route.js";

dotenv.config();

// ✅ Connect to Database
connectDB();

const app = express();

// ✅ Middleware
app.use(
  cors({
    origin: "http://localhost:5173", 
    credentials: true, 
  })
);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));

// ✅ Routes
app.use("/api/auth", authRouter);
app.use("/api/messages", messageRouter);

// ✅ 404 Handler
app.use((req, res, next) => {
  next(createError(404, "Route not found"));
});

// ✅ Error Handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

export default app;

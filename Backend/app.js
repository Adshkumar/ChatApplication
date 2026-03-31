// app.js
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";

import authRouter from "./routes/auth.route.js";
import messageRouter from "./routes/message.route.js";
import callRouter from "./routes/call.route.js";
import statusRouter from "./routes/status.route.js";
import { limiter, authLimiter } from "./middleware/rateLimiter.js";

dotenv.config();

connectDB();

const app = express();
app.set('trust proxy', 1);
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  cors({
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
      
      console.log("⚠️ CORS blocked origin:", origin);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

if (isProduction) {
  console.log(`🌐 Production CORS configured to allow all .vercel.app domains`);
}
    
app.use(limiter);
// app.use("/login", authLimiter);

app.use(logger("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));

app.use("/api/auth", authRouter);
app.use("/api/messages", messageRouter);
app.use("/api/calls", callRouter);
app.use("/api/status", statusRouter);

app.use((req, res, next) => {
  next(createError(404, "Route not found"));
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

export default app;
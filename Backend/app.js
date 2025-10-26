import dotenv from 'dotenv';
import connectDB from "./config/db.js";
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';

// import indexRouter from './routes/index.js';
// import usersRouter from './routes/users.js';
import authRouter from './routes/auth.route.js';
import messageRouter from './routes/message.route.js';

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'public')));

// Routes
// app.use('/', indexRouter);
// app.use('/users', usersRouter);
app.use('/api/auth', authRouter);
app.use("/api/messages", messageRouter); 
// 404 handler
app.use((req, res, next) => next(createError(404)));

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

export default app;

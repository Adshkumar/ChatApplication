import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 20,          // Allow up to 20 simultaneous DB operations (default is 5)
      minPoolSize: 5,           // Keep 5 connections warm and ready
      serverSelectionTimeoutMS: 5000,  // Fail fast if MongoDB unreachable
      socketTimeoutMS: 45000,   // Close idle sockets after 45s
      connectTimeoutMS: 10000,  // Timeout initial connection after 10s
    });
    console.log("✅ MongoDB Atlas connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;

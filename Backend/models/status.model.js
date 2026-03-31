import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    text: {
      type: String,
    },
    backgroundColor: {
      type: String,
      default: "#1a1530",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '24h' }
    },
    views: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Status = mongoose.model("Status", statusSchema);

export default Status;

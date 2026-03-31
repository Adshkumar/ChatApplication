import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "missed", "rejected", "ongoing"],
      default: "missed",
    },
    duration: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ["video", "audio"],
      default: "video",
    },
    showForCaller: {
      type: Boolean,
      default: true,
    },
    showForReceiver: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const CallLog = mongoose.model("CallLog", callLogSchema);

export default CallLog;

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index: speeds up conversation queries (getMessages + aggregation pipeline)
messageSchema.index({ senderID: 1, receiverID: 1, createdAt: -1 });
messageSchema.index({ receiverID: 1, senderID: 1, createdAt: -1 });
// Index for markMessagesAsRead bulk updates
messageSchema.index({ senderID: 1, receiverID: 1, isRead: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;

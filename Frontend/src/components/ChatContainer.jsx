import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/UseAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Trash2, Ban, Check } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
    markMessagesAsRead,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (selectedUser) {
      const userId = selectedUser._id || selectedUser.id;
      getMessages(userId);
      markMessagesAsRead(userId);
      subscribeToMessages();

      return () => unsubscribeFromMessages();
    }
  }, [selectedUser, socket, getMessages, subscribeToMessages, unsubscribeFromMessages, markMessagesAsRead]);

  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg.isRead && (lastMsg.senderID?._id || lastMsg.senderID) === selectedUser._id) {
        markMessagesAsRead(selectedUser._id);
      }
    }
  }, [messages, selectedUser, markMessagesAsRead]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleRightClick = (e, message) => {
    e.preventDefault();
    if (message.isDeleted) return;

    const myId = authUser._id || authUser.id;
    const isSender = (message.senderID || message.senderId)?.toString() === myId?.toString();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId: message._id,
      isSender,
    });
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    await deleteMessage(contextMenu.messageId);
    setContextMenu(null);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto" style={{ position: "relative" }}>
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => {
          const authUserId = (authUser?._id || authUser?.id)?.toString();
          const messageSenderId = (message.senderID || message.senderId)?.toString();
          const isOwn = !!authUserId && !!messageSenderId && authUserId === messageSenderId;

          return (
            <div
              key={message._id || idx}
              className={`chat ${isOwn ? "chat-end" : "chat-start"}`}
              ref={idx === messages.length - 1 ? messageEndRef : null}
              onContextMenu={(e) => handleRightClick(e, message)}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isOwn
                        ? authUser?.profilePic || "/avatar.png"
                        : selectedUser?.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header mb-1 flex items-center gap-1.5">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
                {isOwn && (
                  <div className="flex -ml-0.5">
                    <Check className={`size-3.5 ${message.isRead ? "text-blue-400" : "text-zinc-500"} transition-colors`} strokeWidth={3} />
                    <Check className={`size-3.5 -ml-2 ${message.isRead ? "text-blue-400" : "text-zinc-500"} transition-colors`} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Message bubble */}
              {message.isDeleted ? (
                <div
                  className={`chat-bubble flex items-center gap-2 opacity-70 italic ${isOwn ? "border-primary/50 text-primary-content" : "border-base-content/20"}`}
                  style={{
                    background: isOwn ? "rgba(220, 180, 80, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px dashed ${isOwn ? "rgba(220, 180, 80, 0.4)" : "rgba(255, 255, 255, 0.15)"}`,
                    color: isOwn ? "#c8a03c" : "#888",
                    fontSize: "0.85rem",
                  }}
                >
                  <Ban size={14} className={isOwn ? "text-primary" : "text-base-content/40"} />
                  <span>This message was deleted</span>
                </div>
              ) : (
                <div className={`chat-bubble flex flex-col ${isOwn ? "bg-primary text-primary-content" : "bg-base-200"}`}>
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2"
                    />
                  )}
                  {message.text && <p>{message.text}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
            background: "#1e1b2e",
            border: "1px solid rgba(180,140,60,0.35)",
            borderRadius: "10px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            minWidth: "180px",
            overflow: "hidden",
          }}
        >
          <button
            onClick={handleDelete}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "12px 16px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#ff6b6b",
              fontSize: "0.9rem",
              fontWeight: 500,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,107,107,0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Trash2 size={16} />
            {contextMenu.isSender ? "Delete for Everyone" : "Delete for Me"}
          </button>
        </div>
      )}

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
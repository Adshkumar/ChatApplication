import { X, Video, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/UseAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useVideoCallStore } from "../store/useVideoCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, isTyping } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { startCall, callStatus } = useVideoCallStore();

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser?._id?.toString() || selectedUser?.id?.toString());
  const isCallActive = callStatus !== "idle";

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back Button (Mobile only) */}
          <button 
            onClick={() => setSelectedUser(null)}
            className="md:hidden btn btn-ghost btn-sm btn-circle"
          >
             <ArrowLeft size={20} />
          </button>
          {/* Avatar */}
          <div className="avatar">
            <div className={`size-10 rounded-full relative ${isOnline ? "ring-2 ring-emerald-500" : ""}`}>
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className={`text-sm ${isTyping ? "text-emerald-500 font-medium animate-pulse" : "text-base-content/70"}`}>
              {isTyping ? "typing..." : isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Right side buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Video call button */}
          <button
            onClick={() => !isCallActive && startCall(selectedUser)}
            title={isCallActive ? "Call in progress" : "Start video call"}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: isCallActive
                ? "rgba(46,204,113,0.2)"
                : "rgba(200,160,60,0.12)",
              border: `1px solid ${isCallActive ? "rgba(46,204,113,0.5)" : "rgba(200,160,60,0.35)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isCallActive ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              color: isCallActive ? "#2ecc71" : "#c8a03c",
            }}
            onMouseEnter={(e) => {
              if (!isCallActive) {
                e.currentTarget.style.background = "rgba(200,160,60,0.25)";
                e.currentTarget.style.transform = "scale(1.08)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isCallActive
                ? "rgba(46,204,113,0.2)"
                : "rgba(200,160,60,0.12)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Video size={18} />
          </button>

          {/* Close button */}
          <button onClick={() => setSelectedUser(null)}>
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatHeader;
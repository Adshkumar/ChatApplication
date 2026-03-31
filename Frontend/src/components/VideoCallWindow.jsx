import { useEffect, useRef, useState } from "react";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { useChatStore } from "../store/useChatStore";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, UserPlus, Minimize2, Maximize2,
} from "lucide-react";

const VideoBox = ({ stream, muted = false, label, style = {} }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      // In some browsers, manual trigger is needed to guarantee no black screen
      const play = () => ref.current?.play().catch(e => {}); 
      play();
      // Retry playing after a short delay in case of late track arrival
      const timer = setTimeout(play, 1000);
      return () => clearTimeout(timer);
    }
  }, [stream]);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "16px",
        overflow: "hidden",
        background: "#0a0812",
        border: "1px solid rgba(200,160,60,0.2)",
        ...style,
      }}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {label && (
        <span
          style={{
            position: "absolute",
            bottom: "10px",
            left: "12px",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            borderRadius: "6px",
            padding: "2px 8px",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

const AddParticipantModal = ({ onClose }) => {
  const { users } = useChatStore();
  const { addParticipant, peers } = useVideoCallStore();

  const available = users.filter((u) => !peers[u._id || u.id]);

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 100,
        background: "#1a1530",
        border: "1px solid rgba(200,160,60,0.4)",
        borderRadius: "20px",
        padding: "24px",
        minWidth: "280px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h4 style={{ color: "#c8a03c", margin: 0, fontWeight: 700, fontSize: "1rem" }}>Add People</h4>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: "1.2rem" }}
        >
          ×
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
        {available.length === 0 && (
          <p style={{ color: "#777", fontSize: "0.85rem", textAlign: "center" }}>No users to add</p>
        )}
        {available.map((user) => (
          <button
            key={user._id || user.id}
            onClick={() => { addParticipant(user); onClose(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(200,160,60,0.08)",
              border: "1px solid rgba(200,160,60,0.2)",
              borderRadius: "12px",
              padding: "10px 14px",
              cursor: "pointer",
              transition: "background 0.15s",
              color: "#fff",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,160,60,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(200,160,60,0.08)")}
          >
            <img
              src={user.profilePic || "/avatar.png"}
              alt={user.fullName}
              style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
            />
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{user.fullName}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const VideoCallWindow = () => {
  const {
    callStatus, remoteUser, localStream, peers,
    isMuted, isVideoOff, isMinimized,
    toggleMute, toggleVideo, toggleMinimize, endCall,
  } = useVideoCallStore();

  const [showAddParticipant, setShowAddParticipant] = useState(false);

  if (callStatus !== "active" && callStatus !== "calling") return null;

  const participantEntries = Object.entries(peers);
  const totalParticipants = participantEntries.length + 1;

  const isCalling = callStatus === "calling";
  if (isMinimized) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "220px",
          zIndex: 9999,
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
          border: "2px solid rgba(200,160,60,0.5)",
        }}
      >
        <VideoBox stream={localStream} muted label="You" style={{ height: "160px" }} />
        <div
          style={{
            background: "#0f0d1e",
            display: "flex",
            justifyContent: "space-around",
            padding: "8px",
          }}
        >
          <button onClick={endCall} style={btnStyle("#ff4757")}>
            <PhoneOff size={16} />
          </button>
          <button onClick={toggleMinimize} style={btnStyle("#c8a03c")}>
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(135deg, #0a0812 0%, #12102a 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "rgba(0,0,0,0.3)",
          borderBottom: "1px solid rgba(200,160,60,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={remoteUser?.profilePic || "/avatar.png"}
            alt={remoteUser?.fullName}
            style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(200,160,60,0.5)" }}
          />
          <div>
            <h3 style={{ color: "#fff", margin: 0, fontWeight: 700, fontSize: "1.05rem" }}>
              {isCalling ? `Calling ${remoteUser?.fullName}…` : remoteUser?.fullName}
            </h3>
            <p style={{ color: "#c8a03c", margin: 0, fontSize: "0.75rem" }}>
              {isCalling ? "Waiting for answer" : `${totalParticipants} participants`}
            </p>
          </div>
        </div>
        <button onClick={toggleMinimize} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
          <Minimize2 size={20} />
        </button>
      </div>

      {/* Video Grid */}
      <div
        style={{
          flex: 1,
          padding: "20px",
          display: "grid",
          gap: "12px",
          gridTemplateColumns: (totalParticipants <= 2) ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
          alignItems: "center",
          justifyItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Remote participants (only if not calling) */}
        {!isCalling && participantEntries.map(([userId, { remoteStream }]) => (
          <VideoBox
            key={userId}
            stream={remoteStream}
            label={remoteUser?.fullName || "Participant"}
            style={{
              width: "100%",
              height: "100%",
              // For 1-on-1, the remote user takes the full background
              ...(totalParticipants <= 2 ? { position: "absolute", inset: 0, zIndex: 1 } : { maxHeight: "480px", minHeight: "200px" })
            }}
          />
        ))}

        {/* Local video (Yourself) */}
        <VideoBox
          stream={localStream}
          muted
          label="You"
          style={{
            // For 1-on-1, your own video is a small overlay (PiP)
            ...(totalParticipants <= 2 || isCalling
              ? {
                position: "absolute",
                top: "20px",
                right: "20px",
                width: isCalling ? "100%" : "160px",
                height: isCalling ? "100%" : "240px",
                zIndex: isCalling ? 0 : 10,
                border: isCalling ? "none" : "2px solid rgba(255,255,255,0.2)",
                borderRadius: isCalling ? "0" : "16px",
                maxHeight: isCalling ? "none" : "240px",
                boxShadow: isCalling ? "none" : "0 8px 32px rgba(0,0,0,0.5)",
                transition: "all 0.5s ease-in-out",
              }
              : { width: "100%", height: "100%", maxHeight: "480px", minHeight: "200px" }
            )
          }}
        />

        {/* Calling overlay */}
        {isCalling && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ position: "absolute", width: "110px", height: "110px", borderRadius: "50%", border: "3px solid rgba(200,160,60,0.5)", animation: "ring-out 1.5s ease-out infinite" }} />
              <div style={{ position: "absolute", width: "130px", height: "130px", borderRadius: "50%", border: "2px solid rgba(200,160,60,0.3)", animation: "ring-out 1.5s ease-out infinite 0.4s" }} />
              <style>{`
                @keyframes ring-out {
                  0% { transform: scale(0.8); opacity: 1; }
                  100% { transform: scale(1.4); opacity: 0; }
                }
              `}</style>
              <img
                src={remoteUser?.profilePic || "/avatar.png"}
                alt=""
                style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(200,160,60,0.6)" }}
              />
            </div>
            <p style={{ color: "#c8a03c", fontWeight: 600, fontSize: "1.1rem", margin: 0 }}>Calling…</p>
          </div>
        )}

        {/* Add participant modal */}
        {showAddParticipant && (
          <AddParticipantModal onClose={() => setShowAddParticipant(false)} />
        )}
      </div>

      {/* Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px",
          padding: "20px 24px",
          background: "rgba(0,0,0,0.4)",
          borderTop: "1px solid rgba(200,160,60,0.15)",
        }}
      >
        {/* Mute */}
        <ControlBtn onClick={toggleMute} active={isMuted} label={isMuted ? "Unmute" : "Mute"} color="#c8a03c">
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </ControlBtn>

        {/* Video toggle */}
        <ControlBtn onClick={toggleVideo} active={isVideoOff} label={isVideoOff ? "Start Video" : "Stop Video"} color="#c8a03c">
          {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
        </ControlBtn>

        {/* Add participant (only when active call) */}
        {!isCalling && (
          <ControlBtn onClick={() => setShowAddParticipant(!showAddParticipant)} label="Add People" color="#7b68ee">
            <UserPlus size={22} />
          </ControlBtn>
        )}

        {/* End call */}
        <ControlBtn onClick={endCall} label="End Call" color="#ff4757" isEndCall>
          <PhoneOff size={22} />
        </ControlBtn>
      </div>
    </div>
  );
};

const btnStyle = (color) => ({
  background: color,
  border: "none",
  borderRadius: "50%",
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#fff",
});

const ControlBtn = ({ children, onClick, active, label, color, isEndCall }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
    <button
      onClick={onClick}
      style={{
        width: isEndCall ? "64px" : "52px",
        height: isEndCall ? "64px" : "52px",
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active
          ? color
          : isEndCall
            ? "linear-gradient(135deg, #ff4757 0%, #c0392b 100%)"
            : "rgba(255,255,255,0.08)",
        color: active || isEndCall ? "#fff" : "#ccc",
        boxShadow: isEndCall ? `0 4px 20px rgba(255,71,87,0.5)` : "none",
        transition: "transform 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {children}
    </button>
    <span style={{ color: "#999", fontSize: "0.7rem" }}>{label}</span>
  </div>
);

export default VideoCallWindow;

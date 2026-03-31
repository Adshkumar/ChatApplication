import { useEffect, useRef, useState } from "react";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, UserPlus, Minimize2, Maximize2, X
} from "lucide-react";

const VideoBox = ({ stream, muted = false, label, style = {} }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;

      const kickstart = () => {
        if (ref.current) {
          if (ref.current.paused || ref.current.readyState < 2) {
            ref.current.play().catch(() => { });
          }
          if (!muted && ref.current.paused) {
            ref.current.play().catch(() => { });
          }
        }
      };

      kickstart();
      const interval = setInterval(kickstart, 1500);
      return () => clearInterval(interval);
    }
  }, [stream, muted]);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        background: "#0a0812",
        border: "2px solid rgba(200,160,60,0.25)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease",
        ...style,
      }}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        style={{ 
          width: "100%", 
          height: "100%", 
          objectFit: "cover", 
          display: "block",
          transform: muted ? "scaleX(-1)" : "none" // Mirror self view
        }}
      />
      <div 
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)",
          pointerEvents: "none"
        }}
      />
      {label && (
        <span
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            background: "rgba(26, 21, 48, 0.8)",
            backdropFilter: "blur(4px)",
            color: "#fff",
            borderRadius: "8px",
            padding: "4px 12px",
            fontSize: "0.85rem",
            fontWeight: 600,
            border: "1px solid rgba(200,160,60,0.3)",
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

  const authUser = useAuthStore.getState().authUser;
  const myId = (authUser?._id || authUser?.id)?.toString();
  const activeParticipants = Object.entries(peers).filter(([id, peer]) => 
    !!peer.pc && id !== "undefined" && id !== "null" && id !== myId
  );
  const totalParticipants = activeParticipants.length + 1;

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
          <button onClick={() => window.location.reload()} title="Emergency Refresh" style={minBtnStyle("#c8a03c")}><X size={14} style={{ transform: 'rotate(45deg)' }} /></button>
          <button onClick={toggleMinimize} style={minBtnStyle("#2ecc71")}><Maximize2 size={14} /></button>
          <button onClick={endCall} style={minBtnStyle("#ff4757")}><PhoneOff size={14} /></button>
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

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "1px" }}>VER 3.1</div>
          <button
            onClick={() => window.location.reload()}
            title="Emergency Refresh"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <X size={14} style={{ transform: "rotate(45deg)" }} />
          </button>
          <button onClick={toggleMinimize} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
            <Minimize2 size={20} />
          </button>
        </div>
      </div>

      {/* Video Area (Main Grid / Half-Half) */}
      <div
        style={{
          flex: 1,
          padding: totalParticipants <= 2 ? "0" : "20px",
          display: "grid",
          gridTemplateColumns: totalParticipants === 2 ? "1fr" : totalParticipants <= 1 ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
          gridTemplateRows: totalParticipants === 2 ? "repeat(2, 1fr)" : totalParticipants > 2 ? "1fr" : "100%",
          gap: totalParticipants <= 2 ? "2px" : "15px",
          alignItems: "stretch",
          justifyContent: "stretch",
          position: "relative",
          overflow: "hidden",
          background: "#0a0812",
          width: "100%",
        }}
      >
        {/* Remote participant(s) */}
        {!isCalling && activeParticipants.map(([userId, { remoteStream }]) => (
          <VideoBox
            key={userId}
            stream={remoteStream}
            label={remoteUser?.fullName || "Participant"}
            style={{ 
              height: "100%",
              width: "100%",
              borderRadius: totalParticipants <= 2 ? "0" : "20px"
            }}
          />
        ))}

        {/* Local Stream (Self) */}
        <VideoBox
          stream={localStream}
          muted
          label="You"
          style={{
            height: "100%",
            width: "100%",
            borderRadius: totalParticipants <= 2 ? "0" : "20px",
            ...(isCalling ? { 
              position: "absolute", 
              inset: 0,
              maxHeight: "none",
              borderRadius: 0,
              border: "none"
            } : {})
          }}
        />

        {/* Calling Overlay */}
        {isCalling && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
              zIndex: 5,
              background: "rgba(10, 8, 18, 0.4)",
              backdropFilter: "blur(25px)"
            }}
          >
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", width: "120px", height: "120px", borderRadius: "50%", border: "4px solid rgba(200,160,60,0.4)", animation: "ring-out 2s ease-out infinite" }} />
              <div style={{ position: "absolute", width: "150px", height: "150px", borderRadius: "50%", border: "2px solid rgba(200,160,60,0.2)", animation: "ring-out 2s ease-out infinite 0.5s" }} />
              <img
                src={remoteUser?.profilePic || "/avatar.png"}
                alt=""
                style={{ width: "110px", height: "110px", borderRadius: "50%", border: "4px solid rgba(200,160,60,0.6)", objectFit: "cover", boxShadow: "0 0 40px rgba(200,160,60,0.3)" }}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#c8a03c", fontWeight: 800, fontSize: "1.4rem", margin: 0, letterSpacing: "2px" }}>Connecting Call…</p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginTop: "8px" }}>Establishing peer connection</p>
            </div>
          </div>
        )}

        {showAddParticipant && <AddParticipantModal onClose={() => setShowAddParticipant(false)} />}
      </div>

      {/* Control Buttons Bar */}
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
        <ControlBtn onClick={toggleMute} active={isMuted} label={isMuted ? "Unmute" : "Mute"} color="#c8a03c">
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </ControlBtn>
        <ControlBtn onClick={toggleVideo} active={isVideoOff} label={isVideoOff ? "Cam On" : "Cam Off"} color="#c8a03c">
          {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
        </ControlBtn>
        {!isCalling && (
          <ControlBtn onClick={() => setShowAddParticipant(!showAddParticipant)} label="Add People" color="#7b68ee">
            <UserPlus size={22} />
          </ControlBtn>
        )}
        <ControlBtn onClick={endCall} label="End Call" color="#ff4757" isEndCall>
          <PhoneOff size={22} />
        </ControlBtn>
      </div>
    </div>
  );
};

const minBtnStyle = (color) => ({
  background: color,
  border: "none",
  borderRadius: "50%",
  width: "28px",
  height: "28px",
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

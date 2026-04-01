import { useState } from "react";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { PhoneOff, Video } from "lucide-react";

const IncomingCallModal = () => {
  const { callStatus, remoteUser, acceptCall, rejectCall, isAddedToCall } =
    useVideoCallStore();
  const [isAccepting, setIsAccepting] = useState(false);

  if (callStatus !== "ringing") return null;

  const handleAccept = async (e) => {
    if (e && e.detail === 0 && e.type === 'click') return;
    if (isAccepting || callStatus !== "ringing") return;

    setIsAccepting(true);
    try {
      await acceptCall();
      // If acceptCall finished but didn't actually transition us to 'active'
      // (e.g. because of an early return error), we must turn off the spinner
      if (useVideoCallStore.getState().callStatus === "ringing") {
        setIsAccepting(false);
      }
    } catch (e) {
      console.error("Accept failed:", e);
      setIsAccepting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1a1530 0%, #0f0d1e 100%)",
          border: "1px solid rgba(200,160,60,0.3)",
          borderRadius: "24px",
          padding: "40px 32px",
          minWidth: "320px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 0 60px rgba(200,160,60,0.15), 0 20px 60px rgba(0,0,0,0.6)",
          animation: "incoming-pulse 1.5s ease-in-out infinite",
        }}
      >
        <style>{`
          @keyframes incoming-pulse {
            0%, 100% { box-shadow: 0 0 30px rgba(200,160,60,0.15), 0 20px 60px rgba(0,0,0,0.6); }
            50% { box-shadow: 0 0 60px rgba(200,160,60,0.4), 0 20px 60px rgba(0,0,0,0.6); }
          }
          @keyframes ring-spin {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.8); opacity: 0; }
          }
        `}</style>

        {/* Pulsing avatar ring */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute",
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              border: "3px solid rgba(200,160,60,0.6)",
              animation: "ring-spin 1.5s ease-out infinite",
            }}
          />
          <img
            src={remoteUser?.profilePic || "/avatar.png"}
            alt={remoteUser?.fullName}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid rgba(200,160,60,0.5)",
            }}
          />
        </div>

        {/* Text info */}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#c8a03c", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
            {isAddedToCall ? "Added to a call" : "Incoming Video Call"}
          </p>
          <h3 style={{ color: "#fff", fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
            {remoteUser?.fullName || "Unknown"}
          </h3>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "32px", marginTop: "8px" }}>
          {/* Reject */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <button
              onClick={rejectCall}
              disabled={isAccepting}
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: isAccepting ? "#444" : "linear-gradient(135deg, #ff4757 0%, #c0392b 100%)",
                border: "none",
                cursor: isAccepting ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isAccepting ? "none" : "0 4px 20px rgba(255,71,87,0.4)",
                transition: "transform 0.15s, box-shadow 0.15s",
                opacity: isAccepting ? 0.5 : 1,
              }}
            >
              <PhoneOff size={24} color="#fff" />
            </button>
            <span style={{ color: "#ff6b6b", fontSize: "0.75rem", fontWeight: 500 }}>Decline</span>
          </div>

          {/* Accept */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: isAccepting ? "#444" : "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
                border: "none",
                cursor: isAccepting ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isAccepting ? "none" : "0 4px 20px rgba(46,204,113,0.4)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              {isAccepting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Video size={24} color="#fff" />
              )}
            </button>
            <span style={{ color: "#2ecc71", fontSize: "0.75rem", fontWeight: 500 }}>{isAccepting ? "Connecting..." : "Accept"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;

import { create } from "zustand";
import { useAuthStore } from "./UseAuthStore";
import toast from "react-hot-toast";

// WebRTC ICE configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export const useVideoCallStore = create((set, get) => ({
  callStatus: "idle",
  remoteUser: null,
  roomId: null,
  incomingOffer: null,
  isAddedToCall: false,

  localStream: null,
  // peers: { [userId]: { pc, remoteStream, pendingIceCandidates } }
  peers: {},

  isMuted: false,
  isVideoOff: false,
  isMinimized: false,

  _getSocket: () => useAuthStore.getState().socket,
  _getAuthUser: () => useAuthStore.getState().authUser,

  startCall: async (targetUser) => {
    const { _getSocket, _getAuthUser, _createPeerConnection } = get();
    const socket = _getSocket();
    const authUser = _getAuthUser();
    if (!socket || !authUser) return;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      // console.error("Media error:", err);
      toast.error("Camera access denied.");
      return;
    }

    const roomId = `${authUser._id}-${targetUser._id}-${Date.now()}`;
    const toUserId = (targetUser._id || targetUser.id).toString();

    if (get().peers[toUserId]) {
      get().peers[toUserId].pc?.close();
    }

    const pc = _createPeerConnection(toUserId, stream, roomId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    set({
      callStatus: "calling",
      remoteUser: targetUser,
      roomId,
      localStream: stream,
      peers: {
        ...get().peers,
        [toUserId]: { pc, remoteStream: null, pendingIceCandidates: [] }
      },
    });

    socket.emit("call-user", { toUserId, fromUser: authUser, offer, roomId });
  },

  acceptCall: async () => {
    const { incomingOffer, remoteUser, roomId, _getSocket, _getAuthUser, _createPeerConnection } = get();
    const socket = _getSocket();
    const authUser = _getAuthUser();
    if (!socket || !authUser || !incomingOffer || !remoteUser) return;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      toast.error("Camera access denied.");
      get().rejectCall();
      return;
    }

    const toUserId = (remoteUser._id || remoteUser.id).toString();

    // Clean up any existing connection for this user
    if (get().peers[toUserId]) {
      get().peers[toUserId].pc?.close();
    }

    const pc = _createPeerConnection(toUserId, stream, roomId);

    // Update state BEFORE setRemoteDescription so candidates are handled correctly
    set((state) => ({
      callStatus: "active",
      localStream: stream,
      incomingOffer: null,
      peers: {
        ...state.peers,
        [toUserId]: { pc, remoteStream: null, pendingIceCandidates: state.peers[toUserId]?.pendingIceCandidates || [] }
      },
    }));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call-accepted", { toUserId, answer, roomId });
      get()._processPendingCandidates(toUserId);
    } catch (err) {
      console.error("Signaling error:", err);
    }
  },

  rejectCall: () => {
    const { remoteUser, roomId, _getSocket } = get();
    const socket = _getSocket();
    const toUserId = (remoteUser?._id || remoteUser?.id)?.toString();
    if (socket && toUserId) socket.emit("call-rejected", { toUserId, roomId });
    get()._cleanup();
  },

  endCall: () => {
    const { peers, roomId, _getSocket } = get();
    const socket = _getSocket();
    Object.keys(peers).forEach((userId) => {
      socket?.emit("end-call", { toUserId: userId, roomId });
    });
    get()._cleanup();
  },

  addParticipant: async (targetUser) => {
    const { roomId, localStream, peers, _getSocket, _getAuthUser, _createPeerConnection } = get();
    const socket = _getSocket();
    const authUser = _getAuthUser();
    if (!socket || !authUser || !localStream) return;

    const toUserId = (targetUser._id || targetUser.id).toString();
    if (peers[toUserId]) return;

    const pc = _createPeerConnection(toUserId, localStream, roomId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    set({ peers: { ...peers, [toUserId]: { pc, remoteStream: null, pendingIceCandidates: [] } } });
    socket.emit("add-participant", { toUserId, fromUser: authUser, offer, roomId });
  },

  _createPeerConnection: (remoteUserId, localStream, roomId) => {
    // console.log(`📡 Creating PeerConnection for: ${remoteUserId}`);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        get()._getSocket()?.emit("ice-candidate", {
          toUserId: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      // Create a fresh MediaStream or add track to existing one
      set((state) => {
        const peer = state.peers[remoteUserId];
        const stream = peer?.remoteStream || new MediaStream();
        
        // Add the new track (it will contain both audio and video eventually)
        if (!stream.getTracks().includes(event.track)) {
          stream.addTrack(event.track);
        }

        return {
          peers: {
            ...state.peers,
            // We create a NEW MediaStream instance to force React to update srcObject
            [remoteUserId]: { ...state.peers[remoteUserId], remoteStream: new MediaStream(stream.getTracks()) },
          },
        };
      });
    };

    pc.onconnectionstatechange = () => {
      //  console.log(`🚦 [${remoteUserId}] Connection: ${pc.connectionState}`);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Handle disconnection
      }
    };

    return pc;
  },

  handleIncomingCall: ({ fromUser, offer, roomId, isAddedToCall }) => {
    set({
      callStatus: "ringing", remoteUser: fromUser, incomingOffer: offer, roomId,
      isAddedToCall: !!isAddedToCall,
    });
  },

  handleCallAccepted: async ({ answer, toUserId, fromUserId }) => {
    // console.log("✅ Call officially accepted");
    const { peers } = get();
    const userId = fromUserId || toUserId;
    const targetId = userId?.toString();

    const peer = targetId ? peers[targetId] : Object.values(peers)[0];
    if (!peer || !peer.pc) return;

    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      get()._processPendingCandidates(targetId || Object.keys(peers)[0]);
    } catch (err) {
      console.error("Error setting answer:", err);
    }
    set({ callStatus: "active" });
  },

  handleIceCandidate: async ({ candidate, fromUserId }) => {
    const peerId = fromUserId?.toString();
    const { peers } = get();
    const peer = peers[peerId];

    if (!peer || !peer.pc || !peer.pc.remoteDescription) {
      console.log(`⏳ Queuing candidate for ${peerId}`);
      set((state) => {
        const p = state.peers[peerId] || { pendingIceCandidates: [] };
        return {
          peers: { ...state.peers, [peerId]: { ...p, pendingIceCandidates: [...(p.pendingIceCandidates || []), candidate] } }
        };
      });
      return;
    }

    try {
      await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) { console.error("ICE error:", e); }
  },

  _processPendingCandidates: async (userId) => {
    const peer = get().peers[userId];
    if (!peer || !peer.pc || !peer.pendingIceCandidates?.length) return;

    console.log(`🧊 Flushing ${peer.pendingIceCandidates.length} candidates for ${userId}`);
    for (const candidate of peer.pendingIceCandidates) {
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) { console.error("Queued ICE error:", e); }
    }

    set((state) => ({
      peers: { ...state.peers, [userId]: { ...state.peers[userId], pendingIceCandidates: [] } }
    }));
  },

  subscribeToCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("incoming-call");
    socket.off("call-accepted");
    socket.off("call-rejected");
    socket.off("call-ended");
    socket.off("ice-candidate");

    socket.on("incoming-call", (payload) => get().handleIncomingCall(payload));
    socket.on("call-accepted", (payload) => get().handleCallAccepted(payload));
    socket.on("call-rejected", () => {
      toast.error("Call rejected");
      get()._cleanup();
    });
    socket.on("call-ended", () => {
      toast("Call ended", { icon: "📵" });
      get()._cleanup();
    });
    socket.on("ice-candidate", (payload) => get().handleIceCandidate(payload));
  },

  unsubscribeFromCallEvents: () => {
    const socket = get()._getSocket();
    if (socket) {
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-rejected");
      socket.off("call-ended");
      socket.off("ice-candidate");
    }
  },

  _cleanup: () => {
    const { localStream, peers } = get();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    Object.values(peers).forEach(({ pc }) => pc?.close());
    set({
      callStatus: "idle", remoteUser: null, roomId: null, incomingOffer: null,
      isAddedToCall: false, localStream: null, peers: {},
      isMuted: false, isVideoOff: false, isMinimized: false,
    });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    set({ isMuted: !isMuted });
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) localStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    set({ isVideoOff: !isVideoOff });
  },

  toggleMinimize: () => set((s) => ({ isMinimized: !s.isMinimized })),
}));

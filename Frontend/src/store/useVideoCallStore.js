import { create } from "zustand";
import { useAuthStore } from "./useAuthStore.js";
import toast from "react-hot-toast";

// WebRTC ICE configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.services.mozilla.com" },
  ],
};

export const useVideoCallStore = create((set, get) => ({
  callStatus: "idle",
  remoteUser: null,
  roomId: null,
  incomingOffer: null,
  isAddedToCall: false,
  _isSubscribed: false,

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
    if (get().callStatus === "active") return;

    set({ callStatus: "active", incomingOffer: null });

    let stream;
    try {
      toast.loading("Accessing camera...", { id: "media" });
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      toast.success("Camera connected!", { id: "media" });
    } catch (err) {
      console.error("❌ Media error:", err);
      toast.error("Camera access failed. Is it used by another app?", { id: "media" });
      get().rejectCall();
      return;
    }

    const toUserId = (remoteUser._id || remoteUser.id).toString();

    if (get().peers[toUserId]) {
      get().peers[toUserId].pc?.close();
    }

    const pc = _createPeerConnection(toUserId, stream, roomId);

    set((state) => ({
      localStream: stream,
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
      toast.error("Signaling failure.");
      get().endCall();
    }
  },

  rejectCall: () => {
    const { remoteUser, roomId, _getSocket } = get();
    const socket = _getSocket();
    const toUserId = (remoteUser?._id || remoteUser?.id)?.toString();
    if (socket && toUserId) socket.emit("call-rejected", { toUserId, roomId });
    set({ incomingOffer: null });
    get()._cleanup();
  },

  handleCallRejected: () => {
    toast.error("Call rejected");
    get()._cleanup();
  },

  handleCallEnded: () => {
    toast("Call ended", { icon: "📵" });
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
      if (event.track.kind === "video") toast.success(`Video feed received!`, { id: "video-rx" });

      set((state) => {
        const peer = state.peers[remoteUserId];
        const stream = event.streams[0] || peer?.remoteStream || new MediaStream();

        if (!stream.getTracks().find(t => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }

        return {
          peers: {
            ...state.peers,
            [remoteUserId]: { ...state.peers[remoteUserId], remoteStream: new MediaStream(stream.getTracks()) },
          },
        };
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.warn(`Peer connection to ${remoteUserId} ${pc.connectionState}`);
      }
    };

    return pc;
  },

  handleIncomingCall: ({ fromUser, offer, roomId, isAddedToCall }) => {
    const currentStatus = get().callStatus;
    if (currentStatus === "active" && !isAddedToCall) {
      if (get().roomId !== roomId) {
        get()._getSocket()?.emit("call-rejected", { toUserId: fromUser._id, roomId });
      }
      return;
    }

    set({
      callStatus: "ringing", remoteUser: fromUser, incomingOffer: offer, roomId,
      isAddedToCall: !!isAddedToCall,
    });
  },

  handleCallAccepted: async ({ answer, toUserId, fromUserId }) => {
    const { peers, _processPendingCandidates } = get();
    const userId = fromUserId || toUserId;
    const targetId = userId?.toString();
    const peer = targetId ? peers[targetId] : Object.values(peers)[0];

    if (!peer || !peer.pc || peer.isSettingAnswer) return;

    try {
      if (peer.pc.signalingState === "stable") return;

      toast.loading("Linking streams...", { id: "signaling" });
      set(state => ({
        peers: { ...state.peers, [targetId]: { ...peer, isSettingAnswer: true } }
      }));
      
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      _processPendingCandidates(targetId || Object.keys(peers)[0]);
      toast.success("Connected!", { id: "signaling" });
    } catch (err) {
      console.error("Error setting answer:", err);
      if (err.name !== "InvalidStateError") {
        toast.error("Signaling sync failed.");
      }
    } finally {
      set(state => {
        const currentPeer = state.peers[targetId];
        if (!currentPeer) return state;
        return {
          peers: { ...state.peers, [targetId]: { ...currentPeer, isSettingAnswer: false } }
        };
      });
    }
    set({ callStatus: "active" });
  },

  handleIceCandidate: async ({ candidate, fromUserId }) => {
    const peerId = fromUserId?.toString();
    if (!peerId || peerId === "undefined" || peerId === "null") return;
    const { peers } = get();
    const peer = peers[peerId];

    if (!peer || !peer.pc || !peer.pc.remoteDescription) {
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
    if (get()._isSubscribed) return;
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("incoming-call");
    socket.off("call-accepted");
    socket.off("call-rejected");
    socket.off("ice-candidate");
    socket.off("call-ended");
    socket.off("call-log-updated");

    socket.on("incoming-call", (payload) => get().handleIncomingCall(payload));
    socket.on("call-accepted", (payload) => get().handleCallAccepted(payload));
    socket.on("call-rejected", () => get().handleCallRejected());
    socket.on("ice-candidate", (payload) => get().handleIceCandidate(payload));
    socket.on("call-ended", () => get().handleCallEnded());
    socket.on("call-log-updated", () => {
      console.log("Call log updated in background");
    });

    set({ _isSubscribed: true });
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

import { create } from "zustand";
import { useAuthStore } from "./useAuthStore.js";
import toast from "react-hot-toast";

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
  callType: "audio",
  remoteUser: null,
  roomId: null,
  incomingOffer: null,
  isAddedToCall: false,
  _isSubscribed: false,
  localStream: null,
  peers: {},
  isMuted: false,
  isMinimized: false,

  setMuted: (val) => set({ isMuted: val }),
  setMinimized: (val) => set({ isMinimized: val }),

  _getSocket: () => useAuthStore.getState().socket,
  _getAuthUser: () => useAuthStore.getState().authUser,

  startCall: async (targetUser) => {
    const { _getSocket, _getAuthUser, _createPeerConnection, localStream } = get();
    const socket = _getSocket();
    const authUser = _getAuthUser();

    if (!socket || !authUser) return;

    const toUserId = (targetUser._id || targetUser.id).toString();
    
    let stream = localStream;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        set({ localStream: stream });
      } catch (err) {
        toast.error("Microphone access denied.");
        return;
      }
    }

    const pc = _createPeerConnection(toUserId, stream, null);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const roomId = `room_${Date.now()}`;
    set({
      callStatus: "active",
      remoteUser: targetUser,
      roomId,
      callType: "audio",
      peers: { [toUserId]: { pc, remoteStream: null, pendingIceCandidates: [] } }
    });

    socket.emit("call-user", { toUserId, fromUser: authUser, offer, roomId, callMode: "audio" });
  },

  acceptCall: async () => {
    const { incomingOffer, remoteUser, roomId, _getSocket, _getAuthUser, _createPeerConnection } = get();
    const socket = _getSocket();
    const authUser = _getAuthUser();

    if (!socket || !authUser || !remoteUser || !incomingOffer) return;
    if (get().callStatus === "active") return;

    set({ callStatus: "active", incomingOffer: null });

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } catch (err) {
      toast.error("Media access failed.");
      get().rejectCall();
      return;
    }

    const toUserId = remoteUser._id.toString();
    const pc = _createPeerConnection(toUserId, stream, roomId);

    set({
      localStream: stream,
      peers: { ...get().peers, [toUserId]: { pc, remoteStream: null, pendingIceCandidates: [] } }
    });

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call-accepted", { toUserId, answer, roomId });
      get()._processPendingCandidates(toUserId);
    } catch (err) {
       get().endCall();
    }
  },

  rejectCall: () => {
    const { remoteUser, roomId, _getSocket } = get();
    const toUserId = remoteUser?._id?.toString();
    if (_getSocket() && toUserId) _getSocket().emit("call-rejected", { toUserId, roomId });
    get()._cleanup();
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

    return pc;
  },

  handleIncomingCall: (payload) => {
    const { fromUser, offer, roomId, isAddedToCall } = payload;
    if (get().callStatus === "active" && !isAddedToCall) {
      if (get().roomId !== roomId) get()._getSocket()?.emit("call-rejected", { toUserId: fromUser._id, roomId });
      return;
    }
    set({ callStatus: "ringing", remoteUser: fromUser, incomingOffer: offer, roomId, isAddedToCall: !!isAddedToCall, callType: "audio" });
  },

  handleCallAccepted: async ({ answer, toUserId, fromUserId }) => {
    const { peers, _processPendingCandidates } = get();
    const targetId = (fromUserId || toUserId)?.toString();
    const peer = peers[targetId];

    if (!peer || !peer.pc) return;

    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      _processPendingCandidates(targetId);
    } catch (err) {}
    set({ callStatus: "active" });
  },

  handleIceCandidate: async ({ candidate, fromUserId }) => {
    const peerId = fromUserId?.toString();
    if (!peerId) return;
    const { peers } = get();
    const peer = peers[peerId];

    if (!peer || !peer.pc || !peer.pc.remoteDescription) {
      set((state) => {
        const p = state.peers[peerId] || { pendingIceCandidates: [] };
        return { peers: { ...state.peers, [peerId]: { ...p, pendingIceCandidates: [...(p.pendingIceCandidates || []), candidate] } } };
      });
      return;
    }
    try { await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
  },

  _processPendingCandidates: async (userId) => {
    const peer = get().peers[userId];
    if (!peer || !peer.pc || !peer.pendingIceCandidates?.length) return;
    for (const candidate of peer.pendingIceCandidates) {
      try { await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
    }
    set((state) => ({ peers: { ...state.peers, [userId]: { ...state.peers[userId], pendingIceCandidates: [] } } }));
  },

  subscribeToCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    ["v3-incoming-call", "incoming-call", "call-accepted", "call-rejected", "ice-candidate", "call-ended", "call-log-updated"].forEach(e => socket.off(e));
    socket.on("v3-incoming-call", (payload) => get().handleIncomingCall(payload));
    socket.on("incoming-call", (payload) => get().handleIncomingCall(payload));
    socket.on("call-accepted", (payload) => get().handleCallAccepted(payload));
    socket.on("call-rejected", () => get()._cleanup());
    socket.on("ice-candidate", (payload) => get().handleIceCandidate(payload));
    socket.on("call-ended", () => get()._cleanup());
    set({ _isSubscribed: true });
  },

  unsubscribeFromCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    ["v3-incoming-call", "incoming-call", "call-accepted", "call-rejected", "ice-candidate", "call-ended", "call-log-updated"].forEach(e => socket.off(e));
    set({ _isSubscribed: false });
  },

  _cleanup: () => {
    const { localStream, peers } = get();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    Object.values(peers).forEach(({ pc }) => pc?.close());
    set({ callStatus: "idle", remoteUser: null, roomId: null, incomingOffer: null, isAddedToCall: false, localStream: null, peers: {}, isMuted: false, isMinimized: false });
  },

  endCall: () => {
    const { peers, roomId, _getSocket } = get();
    Object.keys(peers).forEach((id) => _getSocket()?.emit("end-call", { toUserId: id, roomId }));
    get()._cleanup();
  },
}));

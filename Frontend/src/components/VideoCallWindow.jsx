import { useEffect, useRef, useState } from "react";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Mic, MicOff, PhoneOff, UserPlus, Minimize2, Maximize2, X, Volume2
} from "lucide-react";

const AudioBox = ({ stream, muted = false, label, avatar }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => { });
    }
  }, [stream, muted]);

  return (
    <div className="relative group flex flex-col items-center justify-center p-6 bg-neutral-focus rounded-3xl border border-primary/20 shadow-xl overflow-hidden transition-all duration-500 hover:border-primary/40">
      {/* Hidden audio element */}
      <audio ref={ref} autoPlay muted={muted} className="hidden" />

      {/* Avatar with Glow */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse scale-110"></div>
        <div className="size-32 md:size-40 rounded-full border-4 border-primary/30 p-1.5 relative overflow-hidden bg-neutral shadow-2xl">
          <img
            src={avatar || "/avatar.png"}
            alt={label}
            className="w-full h-full rounded-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>
        {!muted && (
          <div className="absolute -bottom-2 right-2 size-10 bg-primary rounded-full flex items-center justify-center text-white border-4 border-neutral shadow-lg">
             <Volume2 size={20} className="animate-bounce" />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-1">
        <h3 className="text-xl font-black text-neutral-content">{label}</h3>
        <p className="text-primary text-xs font-bold uppercase tracking-widest opacity-80">
          {muted ? "Speaker" : "Connected"}
        </p>
      </div>

      {/* Pulsing Visualizer Effect */}
      {!muted && (
        <div className="absolute bottom-0 left-0 w-full h-1 flex items-end justify-center gap-0.5 px-10">
          {[...Array(12)].map((_, i) => (
             <div 
               key={i} 
               className="w-full bg-primary/40 rounded-full animate-pulse" 
               style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}
             ></div>
          ))}
        </div>
      )}
    </div>
  );
};

const VideoCallWindow = () => {
  const {
    callStatus, remoteUser, localStream, peers, endCall, addParticipant, roomId
  } = useVideoCallStore();
  const { authUser } = useAuthStore();
  const { onlineUsers } = useChatStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let timer;
    if (callStatus === "active") {
      timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  if (callStatus !== "active") return null;

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleAddParticipant = () => {
    const availableUsers = onlineUsers.filter(u => 
      u._id !== authUser._id && u._id !== remoteUser?._id && !peers[u._id]
    );
    if (availableUsers.length > 0) {
       addParticipant(availableUsers[0]);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[999999] w-64 bg-neutral rounded-2xl shadow-2xl border border-primary/30 p-4 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-primary/10 p-1">
             <img src={remoteUser?.profilePic || "/avatar.png"} className="size-full rounded-lg object-cover" alt="" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-black text-sm truncate">{remoteUser?.fullName}</p>
            <p className="text-primary text-[10px] font-bold uppercase tracking-widest">{formatTime(duration)}</p>
          </div>
          <button onClick={() => setIsMinimized(false)} className="btn btn-ghost btn-circle btn-xs hover:bg-primary/20">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[999999] bg-neutral-900/95 backdrop-blur-md flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
             <Volume2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight leading-none">Voice Call</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
               <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               {formatTime(duration)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(true)} className="btn btn-ghost btn-circle btn-sm hover:bg-white/10">
            <Minimize2 size={20} className="text-white/60" />
          </button>
          <button onClick={endCall} className="btn btn-ghost btn-circle btn-sm hover:bg-error/20 text-error/60">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 p-6 md:p-12 flex items-center justify-center">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* My Perspective */}
          <AudioBox 
            stream={localStream} 
            muted={true} 
            label="You (Microphone)" 
            avatar={authUser?.profilePic} 
          />

          {/* Remote Perspective */}
          <AudioBox 
            stream={Object.values(peers)[0]?.remoteStream} 
            label={remoteUser?.fullName} 
            avatar={remoteUser?.profilePic} 
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-10 flex items-center justify-center animate-in slide-in-from-bottom duration-700 delay-300">
        <div className="bg-neutral bg-opacity-80 backdrop-blur-xl border border-white/5 p-4 rounded-[2.5rem] shadow-2xl flex items-center gap-6 px-10">
          <button 
            onClick={toggleMute}
            className={`btn btn-circle btn-lg ${isMuted ? 'btn-error' : 'btn-ghost bg-white/5 hover:bg-white/15'}`}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>

          <button 
            onClick={endCall}
            className="btn btn-circle btn-lg bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/40 border-none scale-110 active:scale-95"
          >
            <PhoneOff size={28} />
          </button>

          <button 
            onClick={handleAddParticipant}
            className="btn btn-circle btn-lg btn-ghost bg-white/5 hover:bg-white/15 text-white/80"
          >
            <UserPlus size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallWindow;

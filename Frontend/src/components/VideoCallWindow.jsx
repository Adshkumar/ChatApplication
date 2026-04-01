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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className={`relative bg-zinc-900 border border-white/10 shadow-2xl transition-all duration-500 ease-out flex flex-col overflow-hidden
          ${isMinimized 
            ? "fixed bottom-6 right-6 w-52 h-32 rounded-2xl flex-row items-center p-3 gap-3" 
            : "w-full max-w-[380px] h-[600px] rounded-[2.5rem]"}`}
      >
        {/* Header (Hidden when minimized) */}
        {!isMinimized && (
          <div className="p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-primary">
                <Volume2 size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold text-base leading-none">Voice Call</h3>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-emerald-500/90 text-[10px] font-black uppercase tracking-widest">{callTime}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setMinimized(true)}
                className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all"
              >
                <Minimize2 size={18} />
              </button>
              <button 
                onClick={endCall}
                className="p-2 hover:bg-red-500/20 rounded-full text-white/40 hover:text-red-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Minimized View UI */}
        {isMinimized && (
          <>
            <div className="size-16 rounded-full p-0.5 bg-gradient-to-tr from-primary/50 to-transparent">
              <img 
                src={remoteUser?.profilePic || "/avatar.png"} 
                className="w-full h-full rounded-full object-cover border border-white/10 shadow-lg"
                alt=""
              />
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-white font-bold text-sm truncate">{remoteUser?.fullName}</div>
               <div className="text-primary font-black text-[10px] mt-0.5">{callTime}</div>
            </div>
            <button 
              onClick={() => setMinimized(false)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/80 transition-all border border-white/5"
            >
              <Maximize2 size={18} />
            </button>
          </>
        )}

        {/* Main Participants View (Hidden when minimized) */}
        {!isMinimized && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 -mt-8">
            {/* My Local View (Small Card) */}
            <div className="w-full bg-white/5 rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="relative flex flex-col items-center gap-3">
                  <div className="size-24 rounded-full p-1 bg-zinc-900 border border-white/10 shadow-xl">
                    <img src={authUser?.profilePic || "/avatar.png"} className="w-full h-full rounded-full object-cover" alt="" />
                  </div>
                  <div className="text-center">
                    <div className="text-white/90 font-bold text-sm">You (Microphone)</div>
                    <div className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mt-1">Speaker</div>
                  </div>
               </div>
            </div>

            {/* Remote Participant (Main Card) */}
            <div className="w-full bg-white/[0.03] rounded-3xl p-6 border border-white/5 relative flex flex-col items-center gap-4">
               <div className="relative">
                  {/* Pulsing rings for remote audio */}
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping -z-10" style={{ animationDuration: '3s' }}></div>
                  <div className="absolute -inset-2 rounded-full border border-primary/20 animate-pulse -z-10"></div>
                  
                  <div className="size-32 rounded-full p-1.5 bg-zinc-900 border-2 border-primary shadow-[0_0_30px_rgba(200,160,60,0.2)]">
                    <img 
                      src={remoteUser?.profilePic || "/avatar.png"} 
                      className="w-full h-full rounded-full object-cover" 
                      alt=""
                    />
                  </div>
                  {/* Audio Status Indicator */}
                  <div className="absolute bottom-1 right-1 size-8 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center text-primary shadow-lg">
                    <Volume2 size={14} />
                  </div>
               </div>
               
               <div className="text-center">
                  <h4 className="text-white font-black text-lg tracking-tight leading-none">{remoteUser?.fullName}</h4>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-primary font-black text-[10px] uppercase tracking-widest">Connected</span>
                  </div>
               </div>

               {/* Audio Visualizer (Minimalist) */}
               <div className="flex items-center gap-1.5 h-4 mt-2">
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-primary/40 rounded-full transition-all duration-300"
                      style={{ 
                        height: `${Math.random() * 100}%`,
                        animation: `pulse 1.5s ease-in-out infinite ${i * 0.1}s`
                      }}
                    ></div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* Controls Bar (Hidden when minimized) */}
        {!isMinimized && (
          <div className="p-8 mt-auto">
            <div className="bg-zinc-800/80 backdrop-blur-xl border border-white/5 rounded-3xl p-4 flex items-center justify-between shadow-2xl">
              <button 
                onClick={() => setMuted(!isMuted)}
                className={`size-12 rounded-2xl flex items-center justify-center transition-all shadow-lg
                  ${isMuted ? "bg-red-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"}`}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              <button 
                onClick={endCall}
                className="size-16 rounded-3xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-500/20 group"
              >
                <PhoneOff size={28} className="transition-transform group-hover:rotate-12" />
              </button>

              <button className="size-12 rounded-2xl bg-white/5 text-white/60 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all shadow-lg">
                <UserPlus size={22} />
              </button>
            </div>
          </div>
        )}

        {/* Background Decorative Gradient */}
        {!isMinimized && (
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none"></div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
      `}} />
    </div>
  );
};

export default VideoCallWindow;

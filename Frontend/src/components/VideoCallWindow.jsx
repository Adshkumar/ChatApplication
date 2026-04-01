import { useEffect, useState } from "react";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { useAuthStore } from "../store/useAuthStore";
import { 
  Mic, MicOff, PhoneOff, UserPlus, Minimize2, Maximize2, X, Volume2 
} from "lucide-react";

/**
 * COMPACT VOICE CALL WINDOW
 * High-fidelity, desktop-optimized UI for audio-only calls.
 */
const VideoCallWindow = () => {
  const {
    callStatus, remoteUser, endCall, isMuted, setMuted, isMinimized, setMinimized
  } = useVideoCallStore();
  const { authUser } = useAuthStore();
  const [callTime, setCallTime] = useState("0:00");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timer;
    if (callStatus === "active") {
      timer = setInterval(() => {
        setSeconds(prev => {
          const next = prev + 1;
          const mins = Math.floor(next / 60);
          const secs = next % 60;
          setCallTime(`${mins}:${secs.toString().padStart(2, "0")}`);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  if (callStatus !== "active") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className={`relative bg-zinc-900 border border-white/10 shadow-2xl transition-all duration-500 ease-out flex flex-col overflow-hidden
          ${isMinimized 
            ? "fixed bottom-6 right-6 w-52 h-28 rounded-2xl flex-row items-center p-3 gap-3" 
            : "w-full sm:max-w-[360px] h-full max-h-[600px] md:max-h-[580px] rounded-[2rem] sm:rounded-[2.5rem]"}`}
      >
        {/* Header (Hidden when minimized) */}
        {!isMinimized && (
          <div className="p-4 sm:p-6 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="size-8 sm:size-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-primary">
                <Volume2 size={16} className="sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xs sm:text-sm leading-none">Voice Call</h3>
                <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
                  <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-emerald-500/90 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{callTime}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setMinimized(true)}
                className="p-1.5 sm:p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all"
              >
                <Minimize2 size={14} className="sm:w-4 sm:h-4" />
              </button>
              <button 
                onClick={endCall}
                className="p-1.5 sm:p-2 hover:bg-red-500/20 rounded-full text-white/40 hover:text-red-500 transition-all"
              >
                <X size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Minimized View UI */}
        {isMinimized && (
          <>
            <div className="size-14 sm:size-16 rounded-full p-0.5 bg-gradient-to-tr from-primary/50 to-transparent">
              <img 
                src={remoteUser?.profilePic || "/avatar.png"} 
                className="w-full h-full rounded-full object-cover border border-white/10 shadow-lg"
                alt=""
              />
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-white font-bold text-[10px] sm:text-xs truncate">{remoteUser?.fullName}</div>
               <div className="text-primary font-black text-[9px] sm:text-[10px] mt-0.5">{callTime}</div>
            </div>
            <button 
              onClick={() => setMinimized(false)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 transition-all border border-white/5"
            >
              <Maximize2 size={14} className="sm:w-4 sm:h-4" />
            </button>
          </>
        )}

        {/* Main Participants View (Hidden when minimized) */}
        {!isMinimized && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 px-4 sm:px-6 py-2 overflow-y-auto">
            {/* My Local View */}
            <div className="w-full bg-white/5 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/5 flex flex-col items-center gap-2">
               <div className="size-16 sm:size-20 rounded-full p-1 bg-zinc-900 border border-white/10 shadow-lg">
                 <img src={authUser?.profilePic || "/avatar.png"} className="w-full h-full rounded-full object-cover" alt="" />
               </div>
               <div className="text-center">
                 <div className="text-white/60 font-bold text-[10px] sm:text-[11px]">You</div>
               </div>
            </div>

            {/* Remote Participant */}
            <div className="w-full bg-white/[0.03] rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/5 relative flex flex-col items-center gap-4">
               <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping -z-10" style={{ animationDuration: '3s' }}></div>
                  <div className="size-24 sm:size-28 rounded-full p-1.5 bg-zinc-900 border-2 border-primary shadow-[0_0_20px_rgba(200,160,60,0.2)]">
                    <img 
                      src={remoteUser?.profilePic || "/avatar.png"} 
                      className="w-full h-full rounded-full object-cover" 
                      alt=""
                    />
                  </div>
                  <div className="absolute bottom-1 right-1 size-6 sm:size-7 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center text-primary shadow-lg">
                    <Volume2 size={10} className="sm:w-3 sm:h-3" />
                  </div>
               </div>
               
               <div className="text-center">
                  <h4 className="text-white font-black text-base sm:text-lg tracking-tight leading-none">{remoteUser?.fullName}</h4>
                  <div className="text-primary font-black text-[8px] sm:text-[9px] uppercase tracking-widest mt-2">Connected</div>
               </div>

               {/* Audio Visualizer */}
               <div className="flex items-center gap-1 h-3 mt-1">
                  {[...Array(10)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-primary/40 rounded-full transform animate-pulse"
                      style={{ 
                        height: `${30 + Math.random() * 70}%`,
                        animationDelay: `${i * 0.1}s` 
                      }}
                    ></div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* Controls Bar (Hidden when minimized) */}
        {!isMinimized && (
          <div className="p-6 sm:p-8 mt-auto shrink-0">
            <div className="bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-2xl p-2.5 sm:p-3 flex items-center justify-around shadow-2xl">
              <button 
                onClick={() => setMuted(!isMuted)}
                className={`size-10 sm:size-11 rounded-xl flex items-center justify-center transition-all
                  ${isMuted ? "bg-red-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button 
                onClick={endCall}
                className="size-14 sm:size-16 rounded-2xl sm:rounded-3xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-500/20 group"
              >
                <PhoneOff size={24} className="sm:w-7 sm:h-7 transition-transform group-hover:rotate-12" />
              </button>

              <button className="size-10 sm:size-11 rounded-xl bg-white/5 text-white/60 flex items-center justify-center hover:bg-white/10">
                <UserPlus size={18} />
              </button>
            </div>
          </div>
        )}

        {!isMinimized && (
          <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none"></div>
        )}
      </div>
    </div>
  );
};

export default VideoCallWindow;

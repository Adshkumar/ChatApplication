import { useEffect, useState } from "react";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { useAuthStore } from "../store/useAuthStore";
import { 
  Mic, MicOff, PhoneOff, UserPlus, Minimize2, Maximize2, X, Volume2 
} from "lucide-react";

/**
 * WHATSAPP-STYLE VOICE CALL WINDOW
 * Immersive, professional, and fully responsive audio-only UI.
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className={`relative bg-[#0b0b0b] transition-all duration-500 ease-out flex flex-col overflow-hidden text-white
          ${isMinimized 
            ? "fixed bottom-6 right-6 w-52 h-28 rounded-2xl flex-row items-center p-3 gap-3 shadow-2xl border border-white/10" 
            : "w-full h-full sm:w-[380px] sm:h-[650px] sm:max-h-[90vh] sm:rounded-[2.5rem] sm:border sm:border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)]"}`}
      >
        {/* Header (Top Bar) */}
        {!isMinimized && (
          <div className="pt-10 pb-6 px-6 flex flex-col items-center gap-2 z-10">
            <div className="flex items-center gap-1.5 opacity-60">
              <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Encrypted Voice Call</span>
            </div>
            
            <h2 className="text-2xl font-black tracking-tight mt-1">{remoteUser?.fullName}</h2>
            <p className="text-emerald-500 font-bold text-sm tracking-widest">{callTime}</p>

            <div className="absolute top-6 right-6 flex items-center gap-2">
               <button onClick={() => setMinimized(true)} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-all">
                 <Minimize2 size={18} />
               </button>
               <button onClick={endCall} className="p-2 hover:bg-red-500/20 rounded-full text-white/40 transition-all">
                 <X size={18} />
               </button>
            </div>
          </div>
        )}

        {/* Minimized View UI */}
        {isMinimized && (
          <>
            <div className="size-16 rounded-full p-0.5 bg-emerald-500/30">
              <img 
                src={remoteUser?.profilePic || "/avatar.png"} 
                className="w-full h-full rounded-full object-cover border border-white/10 shadow-lg"
                alt=""
              />
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-white font-bold text-xs truncate">{remoteUser?.fullName}</div>
               <div className="text-emerald-500 font-black text-[10px] mt-0.5">{callTime}</div>
            </div>
            <button 
              onClick={() => setMinimized(false)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 transition-all"
            >
              <Maximize2 size={16} />
            </button>
          </>
        )}

        {/* Central Display (WhatsApp Style) */}
        {!isMinimized && (
          <div className="flex-1 relative flex items-center justify-center -mt-10">
            <div className="relative group">
               {/* Pulsing Aura */}
               <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-[pulse_4s_infinite] scale-150 -z-10 opacity-50"></div>
               <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-[pulse_6s_infinite] scale-[2] -z-10"></div>
               
               {/* Large User Avatar */}
               <div className="size-44 sm:size-48 rounded-full p-1.5 bg-gradient-to-tr from-emerald-500/20 via-transparent to-transparent shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                 <div className="size-full rounded-full border-2 border-white/5 p-1 relative">
                    <img 
                       src={remoteUser?.profilePic || "/avatar.png"} 
                       className="w-full h-full rounded-full object-cover" 
                       alt=""
                    />
                    {/* Audio Status Overlay */}
                    <div className="absolute bottom-2 right-2 size-10 bg-[#121212] rounded-full border border-white/10 flex items-center justify-center text-emerald-500 shadow-2xl">
                      <Volume2 size={16} />
                    </div>
                 </div>
               </div>
            </div>

            {/* My Perspective (Floating Small PIP) */}
            <div className="absolute bottom-10 right-8 rounded-2xl overflow-hidden border border-white/10 shadow-2xl w-24 h-32 bg-[#121212] group hover:scale-105 transition-all">
                <img src={authUser?.profilePic || "/avatar.png"} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] font-black uppercase text-white/60">You</div>
            </div>
          </div>
        )}

        {/* Floating Controls Bar (Footer) */}
        {!isMinimized && (
          <div className="p-10 flex items-center justify-center mt-auto z-20">
            <div className="bg-[#1a1a1a]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-4 flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] scale-110 sm:scale-100 transition-transform">
              <button 
                onClick={() => setMuted(!isMuted)}
                className={`size-14 rounded-full flex items-center justify-center transition-all bg-white/5 border border-white/5 hover:bg-white/15
                  ${isMuted ? "bg-red-500 border-red-500 text-white" : "text-white/80"}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button 
                onClick={endCall}
                className="size-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-red-600/30 group"
              >
                <PhoneOff size={28} className="transition-transform group-hover:rotate-12" />
              </button>

              <button className="size-14 rounded-full bg-white/5 border border-white/5 text-white/80 flex items-center justify-center hover:bg-white/15 transition-all">
                <UserPlus size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Subtle Background Pattern */}
        {!isMinimized && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] pointer-events-none opacity-40"></div>
        )}
      </div>
    </div>
  );
};

export default VideoCallWindow;

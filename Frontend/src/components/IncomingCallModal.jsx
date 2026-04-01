import { useState } from "react";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { PhoneOff, Phone } from "lucide-react";

const IncomingCallModal = () => {
  const { callStatus, remoteUser, acceptCall, rejectCall } = useVideoCallStore();
  const [isAccepting, setIsAccepting] = useState(false);

  if (callStatus !== "ringing") return null;

  const handleAccept = async (e) => {
    if (e && e.detail === 0 && e.type === 'click') return;
    if (isAccepting || callStatus !== "ringing") return;

    setIsAccepting(true);
    try {
      await acceptCall();
    } catch (err) {
      console.error("Accept failed:", err);
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-[320px] rounded-[2rem] p-6 shadow-2xl flex flex-col items-center gap-5 text-center relative overflow-hidden group">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-50"></div>
        
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping -z-10"></div>
          <div className="size-20 rounded-full p-1 bg-zinc-900 border-2 border-primary shadow-xl">
            <img 
              src={remoteUser?.profilePic || "/avatar.png"} 
              className="w-full h-full rounded-full object-cover"
              alt=""
            />
          </div>
          <div className="absolute -bottom-1 -right-1 size-7 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center text-primary shadow-lg">
            <Phone size={14} fill="currentColor" />
          </div>
        </div>

        <div className="z-10">
          <span className="text-primary font-black text-[10px] uppercase tracking-[0.2em]">Incoming Voice Call</span>
          <h3 className="text-white font-black text-xl mt-1 tracking-tight truncate max-w-[240px]">
            {remoteUser?.fullName}
          </h3>
        </div>

        <div className="flex items-center gap-4 w-full z-10 px-2 mt-1">
          <button 
            onClick={rejectCall}
            className="flex-1 h-12 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all flex items-center justify-center border border-red-500/20 group/btn"
          >
            <PhoneOff size={20} className="group-hover/btn:rotate-12 transition-transform" />
          </button>
          
          <button 
            onClick={handleAccept}
            disabled={isAccepting}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-content hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-primary/20"
          >
            {isAccepting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <div className="flex items-center gap-2">
                <Phone size={20} fill="currentColor" className="animate-bounce" />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;

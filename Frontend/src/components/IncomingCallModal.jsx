import { useState } from "react";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { Phone, PhoneOff } from "lucide-react";

/**
 * IMMERSIVE WHATSAPP-STYLE INCOMING CALL
 * Full-screen, high-fidelity notification UI.
 */
const IncomingCallModal = () => {
  const { remoteUser, acceptCall, rejectCall, callStatus } = useVideoCallStore();
  const [isAccepting, setIsAccepting] = useState(false);

  if (callStatus !== "ringing" || !remoteUser) return null;

  const handleAccept = async () => {
    setIsAccepting(true);
    await acceptCall();
    setIsAccepting(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between py-24 bg-[#0b0b0b] animate-in fade-in duration-500 overflow-hidden text-white">
      {/* Background Decorative Rings */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000_100%)]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] border border-white/5 rounded-full opacity-20 animate-[pulse_6s_infinite]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[400px] border border-white/5 rounded-full opacity-40 animate-[pulse_4s_infinite]"></div>

      {/* Top Section: Branding & Info */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="bg-emerald-500/10 px-4 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/20 mb-4 scale-110">
          <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Incoming Voice Call</span>
        </div>
        
        <div className="relative group mt-6">
           <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl scale-125"></div>
           <div className="size-40 sm:size-48 rounded-full p-2 bg-gradient-to-tr from-emerald-500/30 to-transparent shadow-2xl relative">
              <img 
                 src={remoteUser?.profilePic || "/avatar.png"} 
                 className="w-full h-full rounded-full object-cover border-2 border-white/10 shadow-2xl"
                 alt=""
              />
              <div className="absolute -bottom-2 -right-2 size-12 bg-[#121212] rounded-full border border-white/10 flex items-center justify-center text-emerald-500 shadow-2xl">
                <Phone size={20} fill="currentColor" className="animate-bounce" />
              </div>
           </div>
        </div>

        <h3 className="text-4xl font-black tracking-tight mt-10 text-center px-6">
          {remoteUser?.fullName}
        </h3>
        <p className="text-white/40 font-bold tracking-widest mt-2 uppercase text-xs">WhatsApp Audio</p>
      </div>

      {/* Bottom Section: Action Controls */}
      <div className="relative z-10 flex items-center gap-16 sm:gap-24 mb-10 w-full justify-center px-10">
        {/* Decline Button */}
        <div className="flex flex-col items-center gap-4 group">
          <button 
            onClick={rejectCall}
            className="size-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-2xl shadow-red-600/30 group-hover:rotate-12"
          >
            <PhoneOff size={32} />
          </button>
          <span className="text-white/40 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Decline</span>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center gap-4 group">
          <button 
            onClick={handleAccept}
            disabled={isAccepting}
            className="size-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-2xl shadow-emerald-500/30 group-hover:-rotate-6"
          >
            {isAccepting ? (
              <span className="loading loading-spinner loading-md"></span>
            ) : (
              <Phone size={32} fill="currentColor" />
            )}
          </button>
          <span className="text-white/40 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Accept</span>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;

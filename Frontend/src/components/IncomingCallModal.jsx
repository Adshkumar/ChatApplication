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
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
      <div className="bg-neutral w-full max-w-xs rounded-[3rem] shadow-2xl border border-primary/30 p-10 flex flex-col items-center text-center scale-110 animate-in zoom-in-95 duration-300">
        
        {/* Pulsing Avatar Ring */}
        <div className="relative mb-8">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <div className="size-24 rounded-full border-4 border-primary/40 p-1 bg-neutral z-10 relative">
                <img
                    src={remoteUser?.profilePic || "/avatar.png"}
                    alt={remoteUser?.fullName}
                    className="w-full h-full rounded-full object-cover"
                />
            </div>
            <div className="absolute -bottom-1 -right-1 size-8 bg-primary rounded-full flex items-center justify-center text-white border-4 border-neutral scale-110">
                <Phone size={14} className="animate-bounce" />
            </div>
        </div>

        <div className="space-y-4 mb-10 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Incoming Voice Call</p>
            <h3 className="text-2xl font-black tracking-tight">{remoteUser?.fullName}</h3>
        </div>

        <div className="flex gap-6 w-full">
            <button
                onClick={rejectCall}
                className="flex-1 h-16 rounded-3xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all duration-300 active:scale-95 border border-red-500/20"
            >
                <PhoneOff size={24} />
            </button>

            <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="flex-1 h-16 rounded-3xl bg-primary hover:bg-primary-focus text-primary-content flex items-center justify-center transition-all duration-300 active:scale-95 shadow-xl shadow-primary/40 group disabled:opacity-50"
            >
                {isAccepting ? (
                    <span className="loading loading-spinner loading-md"></span>
                ) : (
                    <Phone size={24} className="fill-current" />
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;

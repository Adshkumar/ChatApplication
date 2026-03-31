import { useEffect } from "react";
import { useCallHistoryStore } from "../store/useCallHistoryStore";
import { useAuthStore } from "../store/UseAuthStore";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { formatMessageTime } from "../lib/utils";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Phone, Trash2 } from "lucide-react";

const CallHistoryPane = ({ isFullPanel = false }) => {
  const { getCallHistory, callLogs, isHistoryLoading, deleteLog } = useCallHistoryStore();
  const { authUser } = useAuthStore();
  const { startCall } = useVideoCallStore();

  useEffect(() => {
    getCallHistory();
  }, [getCallHistory]);

  const getCallInfo = (log) => {
    const isCaller = log.caller?._id === authUser?._id;
    const partner = isCaller ? log.receiver : log.caller;
    return { isCaller, partner };
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteLog(id);
  };

  if (isHistoryLoading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
      {callLogs.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center p-10 text-center gap-4">
          <div className="p-6 bg-base-200 rounded-full border border-base-300 shadow-inner">
            <Phone size={48} className="text-zinc-500 opacity-50" />
          </div>
          <div>
            <p className="text-2xl font-bold">No recent calls</p>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto mt-2">
              Stay connected! All your voice and video calls will appear here for quick access.
            </p>
          </div>
        </div>
      ) : (
        <div className={`p-4 md:p-6 space-y-3 ${isFullPanel ? "max-w-3xl mx-auto" : "w-full"}`}>
          {callLogs.map((log) => {
            const { isCaller, partner } = getCallInfo(log);
            if (!partner) return null;
            const isMissed = log.status === "missed" || log.status === "rejected";

            return (
              <div 
                key={log._id} 
                className={`flex items-center justify-between p-4 transition-all duration-200 group
                  ${isFullPanel 
                    ? "rounded-2xl bg-base-200/40 hover:bg-base-200 border border-base-300/30 hover:border-primary/20 shadow-sm hover:shadow-md" 
                    : "border-b border-base-300 hover:bg-base-200/60"}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <img 
                      src={partner.profilePic || "/avatar.png"} 
                      alt={partner.fullName} 
                      className={`${isFullPanel ? "size-14" : "size-10"} rounded-full object-cover border-2 border-base-100 shadow-sm`}
                    />
                    {!isCaller && isMissed && (
                      <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-base-100 flex items-center justify-center">
                        <span className="size-1.5 bg-white rounded-full"></span>
                      </span>
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <h3 className={`${isFullPanel ? "text-lg" : "text-base"} font-bold truncate text-base-content max-w-[150px] sm:max-w-full`}>
                      {partner.fullName}
                    </h3>
                    
                    <div className="flex items-center gap-2 mt-1 whitespace-nowrap">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        isCaller ? "bg-base-300 text-zinc-500" : isMissed ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                      }`}>
                        {isCaller ? (
                          <PhoneOutgoing size={10} strokeWidth={3} />
                        ) : isMissed ? (
                          <PhoneMissed size={10} strokeWidth={3} />
                        ) : (
                          <PhoneIncoming size={10} strokeWidth={3} />
                        )}
                        {isCaller ? "Outgoing" : isMissed ? "Missed" : "Incoming"}
                      </div>
                      
                      <span className="text-zinc-500 text-[11px] font-medium">
                        {formatMessageTime(log.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {isFullPanel && log.status !== "missed" && (
                     <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter opacity-0 group-hover:opacity-60 transition-opacity hidden md:block">
                        {log.status === "completed" ? "Successfully Ended" : log.status}
                     </span>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, log._id)}
                    className="btn btn-ghost btn-circle btn-sm text-zinc-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => startCall(partner)}
                    className={`btn btn-circle ${isFullPanel ? "btn-md bg-primary text-primary-content hover:scale-105 shadow-primary/20" : "btn-sm btn-ghost hover:bg-primary/10 text-primary"} transition-all`}
                  >
                    <Video size={isFullPanel ? 20 : 18} fill={isFullPanel ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CallHistoryPane;

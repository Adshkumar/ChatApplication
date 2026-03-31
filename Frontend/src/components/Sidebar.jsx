import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/UseAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { useCallHistoryStore } from "../store/useCallHistoryStore";
import { History, Users, CircleDashed } from "lucide-react";
import CallHistoryPane from "./CallHistoryPane";
import StatusPane from "./StatusPane";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, isTyping, unreadCounts } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();
  const { activeSidebarTab, setActiveSidebarTab } = useCallHistoryStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = users
    .filter((user) => user._id !== (authUser?._id || authUser?.id))
    .filter((user) => (showOnlineOnly ? onlineUsers.includes(user._id) : true))
    .sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(0);
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(0);
      return dateB - dateA;
    });

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-[350px] lg:w-80 border-r border-base-300 flex flex-col transition-all duration-200 bg-base-100/50 backdrop-blur-xl">
      <div className={`border-b border-base-300 w-full ${activeSidebarTab === "status" ? "px-4 pt-3 pb-0" : "p-4 lg:p-5"}`}>
        <div className={`flex items-center justify-between ${activeSidebarTab === "status" ? "mb-1" : "mb-4"}`}>
          <div className="flex items-center gap-2">
            <Users className="size-6 text-primary" />
            <span className="font-bold hidden lg:block text-lg">Contacts</span>
          </div>
          
          <div className="flex items-center gap-1 mr-2 translate-x-[-4px]">
              <button
                onClick={() => setActiveSidebarTab("status")}
                className={`btn btn-ghost btn-sm btn-circle 
                  ${activeSidebarTab === "status" ? "bg-primary/20 text-primary scale-110" : "text-zinc-400"}`}
                title="Status Updates"
              >
                <CircleDashed size={20} />
              </button>
              
              <button
                onClick={() => setActiveSidebarTab("calls")}
                className={`btn btn-ghost btn-sm btn-circle 
                  ${activeSidebarTab === "calls" ? "bg-primary/20 text-primary scale-110" : "text-zinc-400"}`}
                title="Call History"
              >
                <History size={20} />
              </button>
              
              <button
                onClick={() => setActiveSidebarTab("contacts")}
                className={`btn btn-ghost btn-sm btn-circle lg:hidden
                  ${activeSidebarTab === "contacts" ? "bg-primary/20 text-primary scale-110" : "text-zinc-400"}`}
              >
                <Users size={20} />
              </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500 ml-auto">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto w-full ${activeSidebarTab === "status" ? "pt-0 pb-3" : "py-3"}`}>
        {activeSidebarTab === "contacts" ? (
          filteredUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0 shrink-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full border border-base-300"
                />
                
                {/* Online Status Badge (Bottom Right) */}
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3.5 bg-green-500 
                    rounded-full ring-2 ring-base-100"
                  />
                )}

                {/* Unread Message Badge (Top Right) - High Visibility Red */}
                {unreadCounts[(user._id || user.id)?.toString()] > 0 && (
                  <span 
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] font-black h-5.5 min-w-[22px] flex items-center justify-center rounded-full ring-2 ring-zinc-900 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-bounce z-[20] px-1"
                  >
                    {unreadCounts[(user._id || user.id)?.toString()]}
                  </span>
                )}
              </div>

              <div className="flex-1 text-left min-w-0 pr-1 ml-2">
                <div className="flex items-center justify-between">
                   <div className="font-bold truncate text-base-content text-[15px] leading-tight">
                     {user.fullName}
                   </div>
                   <div className="flex items-center gap-1.5 ml-2">
                     {user.lastMessage && (
                       <span className="text-[10px] text-zinc-500 whitespace-nowrap opacity-70">
                         {new Date(user.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                     )}
                   </div>
                </div>
                
                <div className="text-[13px] truncate mt-0.5 font-medium min-h-[20px]">
                  {isTyping && selectedUser?._id === user._id ? (
                    <span className="text-primary font-bold animate-pulse">Typing...</span>
                  ) : user.lastMessage ? (
                    user.lastMessage.isDeleted ? (
                      <span className="text-zinc-500 italic text-xs">Message deleted</span>
                    ) : (
                      <span className={
                        user.lastMessage.senderID === authUser?._id 
                        ? "text-zinc-400" 
                        : unreadCounts[(user._id || user.id)?.toString()] > 0 
                          ? "text-primary/90 font-bold" 
                          : "text-zinc-500 font-medium"
                      }>
                        {user.lastMessage.senderID === authUser?._id && <span className="mr-0.5 text-zinc-500 font-normal">You:</span>}
                        {user.lastMessage.image ? "🖼️ Image" : user.lastMessage.text}
                      </span>
                    )
                  ) : (
                    <span className="text-zinc-500/60 text-xs italic">
                       {onlineUsers.includes(user._id) ? "Online" : "Say hello!"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : activeSidebarTab === "calls" ? (
          <CallHistoryPane />
        ) : (
          <StatusPane />
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
import { useState, useEffect } from "react";
import { useStatusStore } from "../store/useStatusStore";
import { useAuthStore } from "../store/UseAuthStore";
import { Plus, Trash2, X, Image as ImageIcon, Video, Send, Loader2, CircleDashed, Eye, Users } from "lucide-react";
import toast from "react-hot-toast";

const StatusPane = () => {
  const { statuses, getStatuses, createStatus, deleteStatus, isStatusesLoading, subscribeToStatuses, viewStatus } = useStatusStore();
  const { authUser } = useAuthStore();
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState(null);
  const [showViewers, setShowViewers] = useState(false);

  const selectedStatus = statuses.find(s => s._id.toString() === selectedStatusId?.toString());

  useEffect(() => {
    setShowViewers(false);

    if (selectedStatus && (selectedStatus.userId?._id?.toString() || selectedStatus.userId?.toString()) !== (authUser?._id?.toString() || authUser?.id?.toString())) {
      viewStatus(selectedStatus._id);
    }

    let timeout;
    if (selectedStatusId) {
      timeout = setTimeout(() => setSelectedStatusId(null), 8000);
    }
    return () => clearTimeout(timeout);
  }, [selectedStatusId, selectedStatus, authUser, viewStatus]);

  const [statusText, setStatusText] = useState("");
  const [statusImage, setStatusImage] = useState(null);
  const [statusVideo, setStatusVideo] = useState(null);

  useEffect(() => {
    getStatuses();
    const unsubscribe = subscribeToStatuses();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [getStatuses, subscribeToStatuses]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      return toast.error("Please select an image or video file");
    }

    if (file.size > 20 * 1024 * 1024) {
      return toast.error("File size must be less than 20MB");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (isImage) {
        setStatusImage(reader.result);
        setStatusVideo(null);
      } else {
        setStatusVideo(reader.result);
        setStatusImage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStatus = async () => {
    if (!statusText && !statusImage && !statusVideo) return;
    setIsUploading(true);
    try {
      await createStatus({
        text: statusText,
        image: statusImage,
        video: statusVideo
      });
      setIsAddingStatus(false);
      setStatusText("");
      setStatusImage(null);
      setStatusVideo(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteStatus(id);
    setSelectedStatusId(null);
  };

  const myStatuses = statuses.filter(s => {
    const storyUserId = (s.userId?._id || s.userId)?.toString();
    const myId = (authUser?._id || authUser?.id)?.toString();
    return storyUserId && myId && storyUserId === myId;
  });
  const otherStatuses = statuses.filter(s => {
    const storyUserId = (s.userId?._id || s.userId)?.toString();
    const myId = (authUser?._id || authUser?.id)?.toString();
    return storyUserId && myId && storyUserId !== myId;
  });

  const groupedStatuses = otherStatuses.reduce((acc, status) => {
    const uid = (status.userId?._id || status.userId)?.toString();
    if (uid) {
      if (!acc[uid]) acc[uid] = { user: status.userId, statuses: [] };
      acc[uid].statuses.push(status);
    }
    return acc;
  }, {});

  if (isStatusesLoading) return (
    <div className="flex flex-col items-center justify-center p-12 text-zinc-500 gap-4">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-medium">Loading status updates...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-base-100/30 pt-0">
      {/* Header section - Titler removed for ultimate density */}
      <div className="px-4 pb-0">
        {/* My Status */}
        <div className="flex items-center gap-4 mb-2 bg-base-200/50 p-2.5 rounded-2xl border border-base-300 shadow-sm mt-0">
          <div className="relative group cursor-pointer" onClick={() => setIsAddingStatus(true)}>
            <div className={`size-14 rounded-full p-0.5 border-2 ${myStatuses.length > 0 ? "border-primary animate-pulse" : "border-zinc-500"}`}>
              <img
                src={authUser?.profilePic || "/avatar.png"}
                className="w-full h-full rounded-full object-cover"
                alt="My Status"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 ring-2 ring-base-100 shadow-md">
              <Plus className="size-3 text-primary-content font-bold" />
            </div>
          </div>
          <div className="flex-1">
            <div className="font-bold text-base">My status</div>
            <div className="text-sm text-zinc-400">
              {myStatuses.length > 0 ? `Shared today at ${new Date(myStatuses[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Share an update with your contacts"}
            </div>
          </div>
          {myStatuses.length > 0 && (
            <button
              onClick={() => setSelectedStatusId(myStatuses[0]._id)}
              className="btn btn-primary btn-sm rounded-full px-4 shadow-lg shadow-primary/20"
            >
              View
            </button>
          )}
        </div>

        <div className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 ml-1">Recent updates</div>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[45vh] pr-1 scrollbar-thin">
          {Object.values(groupedStatuses).length === 0 ? (
            <div className="text-center py-12 px-6">
              <CircleDashed className="size-12 opacity-10 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 italic">No new updates from your contacts yet.</p>
            </div>
          ) : (
            Object.values(groupedStatuses).map(({ user, statuses }) => (
              <button
                key={user._id}
                onClick={() => setSelectedStatusId(statuses[0]._id)}
                className="flex items-center gap-4 p-3 hover:bg-base-200/80 transition-all rounded-2xl group border border-transparent hover:border-base-300"
              >
                <div className="size-14 rounded-full border-2 border-emerald-500 p-0.5 group-hover:scale-105 transition-transform duration-300">
                  <img src={user.profilePic || "/avatar.png"} className="w-full h-full rounded-full object-cover" alt={user.fullName} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-[15px]">{user.fullName}</div>
                  <div className="text-xs text-zinc-400 font-medium">
                    {new Date(statuses[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Add Status Modal */}
      {isAddingStatus && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-base-100 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl border border-base-300">
            <div className="p-5 border-b border-base-300 flex items-center justify-between bg-base-200/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary"><ImageIcon size={20} /></div>
                <h3 className="font-bold text-xl">Create New Story</h3>
              </div>
              <button onClick={() => setIsAddingStatus(false)} className="btn btn-ghost btn-sm btn-circle"><X /></button>
            </div>

            <div className="p-8">
              <div className="relative aspect-[4/5] w-full bg-zinc-950 rounded-3xl overflow-hidden flex items-center justify-center border-2 border-dashed border-zinc-800 group hover:border-primary/50 transition-colors">
                {statusImage ? (
                  <img src={statusImage} className="w-full h-full object-contain" alt="Preview" />
                ) : statusVideo ? (
                  <video src={statusVideo} className="w-full h-full object-contain" controls autoPlay loop muted />
                ) : (
                  <div className="text-center group-hover:scale-110 transition-transform">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="p-4 bg-zinc-900 rounded-2xl text-zinc-400 group-hover:text-primary"><ImageIcon size={32} /></div>
                      <div className="p-4 bg-zinc-900 rounded-2xl text-zinc-400 group-hover:text-primary"><Video size={32} /></div>
                    </div>
                    <p className="text-sm text-zinc-500 font-medium px-8">Drop an image or video clip up to 30s</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
              </div>

              <textarea
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What's on your mind?..."
                className="textarea textarea-ghost w-full mt-6 bg-base-200/50 focus:bg-base-200 text-lg p-4 rounded-xl border-none focus:ring-2 focus:ring-primary/20 transition-all resize-none h-24"
                disabled={isUploading}
              />

              <button
                onClick={handleCreateStatus}
                className="btn btn-primary w-full h-14 mt-8 rounded-2xl shadow-xl shadow-primary/30 gap-3 text-lg font-bold"
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="animate-spin" /> : <Send className="size-5" />}
                {isUploading ? "Uploading..." : "Post to Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Viewer Modal */}
      {selectedStatus && (
        <div className="fixed inset-0 z-[210] flex flex-col bg-black overflow-hidden select-none">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-white/10 z-50">
            <div className="h-full bg-white shadow-[0_0_10px_#fff] animate-[progress_8s_linear_forwards]"></div>
          </div>

          <div className="flex items-center justify-between p-6 z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full ring-2 ring-white/50 p-0.5">
                <img src={selectedStatus.userId.profilePic || "/avatar.png"} className="w-full h-full rounded-full object-cover" alt="User" />
              </div>
              <div>
                <div className="text-white font-bold text-lg leading-none">{selectedStatus.userId.fullName}</div>
                <div className="text-white/60 text-xs mt-1 font-medium italic">
                  {new Date(selectedStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(selectedStatus.userId?._id?.toString() || selectedStatus.userId?.toString()) === (authUser?._id?.toString() || authUser?.id?.toString()) && (
                <div className="flex items-center gap-2 mr-4">
                  <button
                    onClick={() => setShowViewers(!showViewers)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${showViewers ? "bg-primary text-primary-content border-primary" : "bg-white/10 text-white border-white/10"}`}
                  >
                    <Eye size={16} />
                    <span className="font-bold text-sm">{selectedStatus.views?.length || 0}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(selectedStatus._id)}
                    className="btn btn-ghost btn-circle text-white hover:bg-red-500/20 hover:text-red-500"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              )}
              <button onClick={() => setSelectedStatusId(null)} className="btn btn-ghost btn-circle text-white hover:rotate-90 transition-transform">
                <X size={32} />
              </button>
            </div>
          </div>

          {/* Viewers List Drawer (WhatsApp Style) */}
          {selectedStatus && showViewers && (
            <div className="absolute inset-x-0 bottom-0 z-[260] bg-zinc-900/95 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-white/10 shadow-2xl p-8 animate-in slide-in-from-bottom duration-500">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-white font-black text-xl uppercase tracking-widest flex items-center gap-3">
                  <Users className="text-primary" />
                  Seen by {selectedStatus.views?.length || 0}
                </h4>
                <button onClick={() => setShowViewers(false)} className="text-white/40 hover:text-white"><X size={24} /></button>
              </div>
              <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin">
                {(selectedStatus.views || []).map((viewer, idx) => (
                  <div key={viewer._id || idx} className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                    <img src={viewer.profilePic || "/avatar.png"} className="size-12 rounded-full object-cover border border-white/10" alt="" />
                    <div className="text-left">
                      <div className="text-white font-bold">{viewer.fullName || "Anonymous"}</div>
                      <div className="text-white/40 text-xs">Recently viewed</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-0 relative">
            {selectedStatus.videoUrl ? (
              <video
                src={selectedStatus.videoUrl}
                className="w-full h-full object-contain"
                autoPlay
                onEnded={() => setSelectedStatus(null)}
              />
            ) : selectedStatus.imageUrl ? (
              <img src={selectedStatus.imageUrl} className="w-full h-full object-contain" alt="Status" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-4xl font-bold text-white text-center px-12 leading-tight tracking-tight shadow-inner"
                style={{ background: `linear-gradient(45deg, ${selectedStatus.backgroundColor}, #000)` }}
              >
                {selectedStatus.text}
              </div>
            )}

            {(selectedStatus.imageUrl || selectedStatus.videoUrl) && selectedStatus.text && (
              <div className="absolute bottom-0 left-0 w-full text-center p-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <p className="text-white text-2xl font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] max-w-2xl mx-auto">{selectedStatus.text}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
};

export default StatusPane;

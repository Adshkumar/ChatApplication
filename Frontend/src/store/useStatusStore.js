import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useStatusStore = create((set, get) => ({
  statuses: [],
  isStatusesLoading: false,

  getStatuses: async () => {
    set({ isStatusesLoading: true });
    try {
      const res = await axiosInstance.get("/status");
      set({ statuses: res.data });
    } catch (error) {
       console.error("Error fetching statuses:", error);
    } finally {
      set({ isStatusesLoading: false });
    }
  },

  createStatus: async (statusData) => {
    try {
      const res = await axiosInstance.post("/status/create", statusData);
      set((state) => ({ statuses: [res.data, ...state.statuses] }));
      toast.success("Status shared!");
    } catch (error) {
      toast.error("Failed to share status");
    }
  },

  deleteStatus: async (id) => {
    try {
      const statusId = id.toString();
      await axiosInstance.delete(`/status/delete/${statusId}`);
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id.toString() !== statusId)
      }));
      toast.success("Status deleted");
    } catch (error) {
      toast.error("Failed to delete status");
    }
  },

  viewStatus: async (id) => {
    try {
      const statusId = id.toString();
      const res = await axiosInstance.post(`/status/view/${statusId}`);
      set((state) => ({
        statuses: state.statuses.map(s => s._id.toString() === statusId ? res.data : s)
      }));
    } catch (error) {
      console.error("Failed to mark status as viewed:", error);
    }
  },

  subscribeToStatuses: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("new-status", (newStatus) => {
      set((state) => {
        if (state.statuses.some(s => s._id.toString() === newStatus._id.toString())) return state;
        return { statuses: [newStatus, ...state.statuses] };
      });
    });

    socket.on("status-deleted", (id) => {
      const deletedId = id.toString();
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id.toString() !== deletedId)
      }));
    });

    socket.on("status-viewed", ({ statusId, viewedBy }) => {
       set((state) => ({
         statuses: state.statuses.map(s => {
           if (s._id.toString() === statusId.toString()) {
              const alreadyViewed = s.views?.some(v => v._id.toString() === viewedBy._id.toString());
              if (!alreadyViewed) {
                return { ...s, views: [...(s.views || []), viewedBy] };
              }
           }
           return s;
         })
       }));
    });

    return () => {
      socket.off("new-status");
      socket.off("status-deleted");
      socket.off("status-viewed");
    };
  }
}));

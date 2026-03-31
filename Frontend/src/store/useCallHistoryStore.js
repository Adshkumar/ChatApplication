import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

export const useCallHistoryStore = create((set, get) => ({
  callLogs: [],
  isHistoryLoading: false,
  activeSidebarTab: "contacts",

  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),

  getCallHistory: async () => {
    set({ isHistoryLoading: true });
    try {
      const res = await axiosInstance.get("/calls/logs");
      set({ callLogs: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch call history");
    } finally {
      set({ isHistoryLoading: false });
    }
  },

  subscribeToCallHistory: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("call-log-updated", () => {
      get().getCallHistory();
    });

    return () => socket.off("call-log-updated");
  },

  deleteLog: async (logId) => {
    try {
      await axiosInstance.delete(`/calls/logs/${logId}`);
      set({ callLogs: get().callLogs.filter((log) => log._id !== logId) });
      toast.success("Call log deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete call log");
    }
  },

  addLogLocally: (log) => {
    set({ callLogs: [log, ...get().callLogs] });
  },
}));

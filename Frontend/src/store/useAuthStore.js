import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";


export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  authRateLimitMessage: null,

  checkAuth: async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        set({ authUser: null, isCheckingAuth: false });
        return;
      }

      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data.user });
      get().connectSocket();
    } catch (error) {
      localStorage.removeItem("token");
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/register", data);
      localStorage.setItem("token", res.data.token);
      set({ authUser: res.data.user });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      if (error.response?.status === 429) {
        let msg = "Too many requests. Please try again later.";
        const data = error.response?.data;
        if (typeof data === 'string') msg = data;
        else if (data && typeof data.message === 'string') msg = data.message;
        set({ authRateLimitMessage: msg });
      } else {
        toast.error(error.response?.data?.message || "Signup failed");
      }
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      localStorage.setItem("token", res.data.token);
      set({ authUser: res.data.user });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      if (error.response?.status === 429) {
        let msg = "Too many authentication attempts.";
        set({ authRateLimitMessage: msg });
      } else {
        toast.error(error.response?.data?.message || "Login failed");
      }
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    localStorage.removeItem("token");
    get().disconnectSocket();
    set({ authUser: null });
    toast.success("Logged out successfully");
    try {
      await axiosInstance.post("/auth/logout");
    } catch (error) {}
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data.user });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Profile update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return;
    if (get().socket?.connected) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      query: { userId: authUser._id },
      transports: ["websocket", "polling"],
    });

    socket.on("getOnlineUsers", (userIds) => set({ onlineUsers: userIds }));

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) socket.disconnect();
    set({ socket: null });
  },
}));

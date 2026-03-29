import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (typeof window === 'undefined') return '';

  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  const hostname = window.location.hostname;
  if (hostname.includes('vercel.app') || hostname.includes('onrender.com')) {
    return 'https://chatapplication-rs0f.onrender.com';
  }

  // Default to localhost for development
  return 'http://localhost:5000';
};

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
      console.log("✅ Auth check successful:", res.data);
      set({ authUser: res.data.user });
      get().connectSocket();
    } catch (error) {
      console.log("❌ Error in checkAuth:", error.response?.data);
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
        let msg = "Too many authentication attempts. Please try again in 10 minutes.";
        const data = error.response?.data;
        if (typeof data === 'string') msg = data;
        else if (data && typeof data.message === 'string') msg = data.message;
        set({ authRateLimitMessage: msg });
      } else {
        toast.error(error.response?.data?.message || "Login failed");
      }
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    // Always clear local state first — user should always be logged out client-side
    localStorage.removeItem("token");
    get().disconnectSocket();
    set({ authUser: null });
    toast.success("Logged out successfully");

    // Attempt to blacklist token on server (best-effort, don't block logout)
    try {
      await axiosInstance.post("/auth/logout");
    } catch (error) {
      // Silently ignore server errors — user is already logged out locally
      console.warn("Logout server call failed (token may already be blacklisted):", error.response?.data?.message);
    }
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

    if (!authUser) {
      console.log("❌ No authUser, cannot connect socket");
      return;
    }

    if (get().socket?.connected) {
      console.log("✅ Socket already connected");
      return;
    }

    const socketUrl = getSocketUrl();
    console.log("🟡 Attempting socket connection for user:", authUser._id);
    console.log("🟡 Socket URL:", socketUrl);

    const socket = io(socketUrl, {
      query: { userId: authUser._id },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected successfully. ID:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected. Reason:", reason);
    });

    socket.on("connect_error", (error) => {
      console.log("❌ Socket connection error:", error.message);
      console.log("❌ Error details:", error);
    });

    socket.on("getOnlineUsers", (userIds) => {
      console.log("👥 Online users received:", userIds);
      set({ onlineUsers: userIds });
    });

    set({ socket });

    console.log("🟡 Socket instance created, waiting for connection...");
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.disconnect();
      console.log("🔴 Socket manually disconnected");
    }
    set({ socket: null });
  },
}));
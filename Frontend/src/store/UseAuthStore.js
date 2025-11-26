import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('token');
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
      localStorage.removeItem('token');
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/register", data);
      
      // Store token in localStorage
      localStorage.setItem('token', res.data.token);
      console.log("✅ Token stored:", res.data.token);
      
      set({ authUser: res.data.user });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      
      // Store token in localStorage
      localStorage.setItem('token', res.data.token);
      // console.log("✅ Token stored:", res.data.token);
      
      set({ authUser: res.data.user });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem('token');
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data.user });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
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

    console.log("🟡 Attempting socket connection for user:", authUser._id);

    const socket = io("http://localhost:5000", {
      query: {
        userId: authUser._id,
      },
    });
    
    socket.connect();

    // Add detailed connection event listeners
    socket.on("connect", () => {
      console.log("✅ Socket connected successfully. ID:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected. Reason:", reason);
    });

    socket.on("connect_error", (error) => {
      console.log("❌ Socket connection error:", error.message);
    });

    socket.on("getOnlineUsers", (userIds) => {
      console.log("👥 Online users received:", userIds);
      set({ onlineUsers: userIds });
    });

    set({ socket });

    console.log("🟡 Socket instance created, waiting for connection...");
  },

  disconnectSocket: () => {
    if (get().socket?.connected) {
      get().socket.disconnect();
      console.log("🔴 Socket manually disconnected");
    }
  },
}));
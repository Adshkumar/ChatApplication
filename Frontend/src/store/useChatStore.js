import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isTyping: false,
  unreadCounts: {},
  _isSubscribedToMessages: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });

      set((state) => ({
        unreadCounts: { ...state.unreadCounts, [userId]: 0 }
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, users } = get();
    if (!selectedUser) return;
    const userId = selectedUser._id || selectedUser.id;

    try {
      const res = await axiosInstance.post(`/messages/send/${userId}`, messageData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newMessage = res.data;
      set({
        messages: [...messages, newMessage],
        users: users.map(u => (u._id === userId || u.id === userId) ? { ...u, lastMessage: newMessage } : u)
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  markMessagesAsRead: async (userId) => {
    if (!userId || userId === "undefined") return;
    try {
      await axiosInstance.put(`/messages/mark-read/${userId}`);
      set((state) => ({
        unreadCounts: { ...state.unreadCounts, [userId]: 0 }
      }));
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const res = await axiosInstance.delete(`/messages/${messageId}`);
      const { deletedForEveryone, deletedForMe } = res.data;

      if (deletedForEveryone) {
        set({
          messages: get().messages.map((msg) =>
            msg._id === messageId ? { ...msg, isDeleted: true, text: null, image: null } : msg
          ),
        });
      } else if (deletedForMe) {
        set({ messages: get().messages.filter((msg) => msg._id !== messageId) });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete message");
    }
  },

  subscribeToMessages: () => {
    if (get()._isSubscribedToMessages) return;
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    get().unsubscribeFromMessages();
    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, users, unreadCounts } = get();

      const senderId = (newMessage.senderID?._id || newMessage.senderID)?.toString();
      const currentSelectedId = (selectedUser?._id || selectedUser?.id)?.toString();
      const isFromSelected = currentSelectedId === senderId;

      const updatedUsers = users.map(u => (u._id === senderId || u.id === senderId) ? { ...u, lastMessage: newMessage } : u);
      const targetUser = updatedUsers.find(u => u._id === senderId || u.id === senderId);
      const otherUsers = updatedUsers.filter(u => u._id !== senderId && u.id !== senderId);

      set({
        messages: isFromSelected ? [...messages, newMessage] : messages,
        users: targetUser ? [targetUser, ...otherUsers] : updatedUsers,
        unreadCounts: isFromSelected
          ? unreadCounts
          : { ...unreadCounts, [senderId]: (unreadCounts[senderId] || 0) + 1 }
      });

      if (!isFromSelected) {
        const sender = users.find(u => (u._id || u.id)?.toString() === senderId);
        const senderName = sender?.fullName || "A contact";
        const preview = newMessage.image ? "Shared an image 📷" : newMessage.text;
        
        toast(`${senderName}: ${preview}`, {
          icon: '💬',
          position: 'top-right',
          style: { background: "#c8a03c", color: "#1a1530", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.2)" }
        });
      }
    });

    socket.on("messagesSeen", ({ byUserId }) => {
      const { selectedUser, messages, users } = get();
      const viewerId = byUserId.toString();

      if (selectedUser && (selectedUser._id === viewerId || selectedUser.id === viewerId)) {
        set({
          messages: messages.map(msg => ({ ...msg, isRead: true }))
        });
      }

      set({
        users: users.map(u => {
          const uid = (u._id || u.id)?.toString();
          if (uid === viewerId && u.lastMessage && u.lastMessage.senderID !== viewerId) {
            return { ...u, lastMessage: { ...u.lastMessage, isRead: true } };
          }
          return u;
        })
      });
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set({
        messages: get().messages.map((m) => m._id === messageId ? { ...m, isDeleted: true } : m),
      });
    });

    socket.on("user-typing", ({ fromUserId }) => {
      if (get().selectedUser?._id === fromUserId) set({ isTyping: true });
    });

    socket.on("user-stop-typing", ({ fromUserId }) => {
      if (get().selectedUser?._id === fromUserId) set({ isTyping: false });
    });

    set({ _isSubscribedToMessages: true });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messageDeleted");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("messagesSeen");
    }
    set({ _isSubscribedToMessages: false });
  },

  setTyping: (isTypingInput) => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (!socket || !selectedUser) return;
    socket.emit(isTypingInput ? "typing" : "stop-typing", { toUserId: selectedUser._id });
  },

  setSelectedUser: (selectedUser) => {
    if (selectedUser) {
      const userId = (selectedUser._id || selectedUser.id || selectedUser).toString();
      set((state) => ({
        selectedUser: typeof selectedUser === 'string' ? { _id: selectedUser } : selectedUser,
        unreadCounts: { ...state.unreadCounts, [userId]: 0 }
      }));
    } else {
      set({ selectedUser: null });
    }
  },
}));
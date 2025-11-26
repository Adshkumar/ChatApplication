// import { create } from "zustand";
// import toast from "react-hot-toast";
// import { axiosInstance } from "../lib/axios";
// import { useAuthStore } from "./useAuthStore";

// export const useChatStore = create((set, get) => ({
//   messages: [],
//   users: [],
//   selectedUser: null,
//   isUsersLoading: false,
//   isMessagesLoading: false,

//   getUsers: async () => {
//     set({ isUsersLoading: true });
//     try {
//       const res = await axiosInstance.get("/messages/users");
//       set({ users: res.data });
//     } catch (error) {
//       toast.error(error.response.data.message);
//     } finally {
//       set({ isUsersLoading: false });
//     }
//   },

//   getMessages: async (userId) => {
//     set({ isMessagesLoading: true });
//     try {
//       const res = await axiosInstance.get(`/messages/${userId}`);
//       set({ messages: res.data });
//     } catch (error) {
//       toast.error(error.response.data.message);
//     } finally {
//       set({ isMessagesLoading: false });
//     }
//   },
  
//   sendMessage: async (messageData) => {
//     const { selectedUser, messages } = get();
    
//     console.log("Selected user:", selectedUser);
//     console.log("Message data:", messageData);
    
//     if (!selectedUser || (!selectedUser._id && !selectedUser.id)) {
//       toast.error("No user selected");
//       return;
//     }

//     // Use id instead of _id since that's what the selectedUser object has
//     const userId = selectedUser._id || selectedUser.id;
    
//     try {
//       const res = await axiosInstance.post(
//         `/messages/send/${userId}`, 
//         messageData,
//         {
//           headers: {
//             'Content-Type': 'multipart/form-data'
//           }
//         }
//       );
//       set({ messages: [...messages, res.data] });
//     } catch (error) {
//       console.log("Error sending message:", error);
//       toast.error(error.response?.data?.message || "Failed to send message");
//     }
//   },

//   subscribeToMessages: () => {
//     const { selectedUser } = get();
//     if (!selectedUser) return;

//     const socket = useAuthStore.getState().socket;
//     if (!socket) {
//       console.log("No socket connection available");
//       return;
//     }

//     // Use id instead of _id
//     const userId = selectedUser._id || selectedUser.id;

//     socket.on("newMessage", (newMessage) => {
//       const isMessageSentFromSelectedUser = newMessage.senderId === userId;
//       if (!isMessageSentFromSelectedUser) return;

//       set({
//         messages: [...get().messages, newMessage],
//       });
//     });
//   },

//   unsubscribeFromMessages: () => {
//     const socket = useAuthStore.getState().socket;
//     if (socket) {
//       socket.off("newMessage");
//     }
//   },

//   setSelectedUser: (selectedUser) => set({ selectedUser }),
// }));

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

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    
    console.log("Selected user:", selectedUser);
    console.log("Message data:", messageData);
    
    if (!selectedUser || (!selectedUser._id && !selectedUser.id)) {
      toast.error("No user selected");
      return;
    }

    // Use id instead of _id since that's what the selectedUser object has
    const userId = selectedUser._id || selectedUser.id;
    
    try {
      const res = await axiosInstance.post(
        `/messages/send/${userId}`, 
        messageData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      console.log("=== FULL ERROR DETAILS ===");
      console.log("Error message:", error.message);
      console.log("Error code:", error.code);
      console.log("Error response:", error.response);
      console.log("Error response data:", error.response?.data);
      console.log("Error response status:", error.response?.status);
      console.log("Error response headers:", error.response?.headers);
      console.log("=== END ERROR DETAILS ===");
      
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.log("No socket connection available");
      return;
    }

    // Use id instead of _id
    const userId = selectedUser._id || selectedUser.id;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === userId;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
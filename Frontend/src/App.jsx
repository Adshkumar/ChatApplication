import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/UseAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect } from "react";

import { Loader, ArrowLeft } from "lucide-react";
import { Toaster } from "react-hot-toast";

// Video Call Components
import VideoCallWindow from "./components/VideoCallWindow";
import IncomingCallModal from "./components/IncomingCallModal";
import { useVideoCallStore } from "./store/useVideoCallStore";
import { useCallHistoryStore } from "./store/useCallHistoryStore";
import CallHistoryPane from "./components/CallHistoryPane";
import { useChatStore } from "./store/useChatStore";
import Sidebar from "./components/Sidebar";
import NoChatSelected from "./components/NoChatSelected";
import ChatContainer from "./components/ChatContainer";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore();
  const { theme } = useThemeStore();
  const { subscribeToCallEvents, unsubscribeFromCallEvents } = useVideoCallStore();
  const { subscribeToCallHistory, activeSidebarTab, setActiveSidebarTab } = useCallHistoryStore();
  const { selectedUser } = useChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (socket) {
      // console.log("🟢 App: Socket detected, subscribing to call events");
      subscribeToCallEvents();
      const unsubscribeHistory = subscribeToCallHistory();
      return () => {
        // console.log("🔴 App: Unsubscribing from call events");
        unsubscribeFromCallEvents();
        if (unsubscribeHistory) unsubscribeHistory();
      };
    }
  }, [socket, subscribeToCallEvents, unsubscribeFromCallEvents, subscribeToCallHistory]);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route path="/" element={authUser ? (
          <div className="h-screen pt-16">
            <div className="flex items-start justify-center px-4 h-[calc(100vh-6rem)]">
              <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-full flex overflow-hidden relative">
                {activeSidebarTab !== "calls" && (
                  <div className={`${selectedUser ? "hidden md:block" : "block"}`}>
                    <Sidebar />
                  </div>
                )}
                <div
                  className={`flex-1 flex flex-col h-full overflow-hidden 
                    ${!selectedUser && activeSidebarTab !== "calls" ? "hidden md:flex" : "flex"}`}
                >
                  {activeSidebarTab === "calls" ? (
                    <div className="flex-1 flex flex-col h-full bg-base-100">
                      <div className="p-4 md:p-6 border-b border-base-300 flex items-center bg-base-100/50 backdrop-blur-sm z-10">
                        <div className="flex items-center gap-4 w-full">
                          <button
                            onClick={() => setActiveSidebarTab("contacts")}
                            className="btn btn-ghost btn-circle btn-sm hover:bg-base-300"
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <div>
                            <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none text-primary">Call History</h2>
                            <p className="text-zinc-500 text-xs md:text-sm font-medium mt-1">Manage your recent interactions</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <CallHistoryPane isFullPanel={true} />
                      </div>
                    </div>
                  ) : !selectedUser ? (
                    <NoChatSelected />
                  ) : (
                    <ChatContainer />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>

      {/* Global overlay modals for video calling — rendered outside route tree */}
      <IncomingCallModal />
      <VideoCallWindow />

      <Toaster />
    </div>
  );
};

export default App;

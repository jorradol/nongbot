import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { AuthView } from "./components/AuthView";
import { DashboardView } from "./components/DashboardView";
import { PostGeneratorView } from "./components/PostGeneratorView";
import { PostViewer } from "./components/PostViewer";
import { AdminView } from "./components/AdminView";
import { testConnection } from "./firebase";
import { AdPost } from "./types";
import { Sparkles, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

function MainAppContent() {
  const { user, loading } = useAuth();
  const [currentView, setView] = useState<string>("dashboard");
  const [selectedPost, setSelectedPost] = useState<AdPost | null>(null);

  // Trigger initial Firestore connectivity specs checking safely
  useEffect(() => {
    testConnection();
  }, []);

  // Display initial loading sequence before React Auth Context is fully resolved
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/50 via-white to-white flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-500 to-amber-500 rounded-2xl mx-auto flex items-center justify-center text-white font-display font-black text-2xl shadow-xl shadow-brand-500/10 animate-spin">
            NB
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">กำลังเตรียมความพร้อม...</h2>
            <p className="text-xs text-gray-400 mt-1">น้องบอท (NongBot) กำลังเชื่อมต่อระบบ Firestore...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated vendors to landing authentication dashboard
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar currentView="" setView={() => {}} />
        <AuthView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <Navbar currentView={currentView} setView={setView} />
      
      <main className="flex-1">
        {currentView === "dashboard" && (
          <DashboardView setView={setView} setSelectedPost={setSelectedPost} />
        )}
        
        {currentView === "generator" && (
          <PostGeneratorView setView={setView} />
        )}

        {currentView === "admin" && user?.email === "jorradol@gmail.com" && (
          <AdminView />
        )}

        {currentView === "post-viewer" && selectedPost && (
          <PostViewer 
            post={selectedPost} 
            onBack={() => { setView("dashboard"); setSelectedPost(null); }} 
            onUpdatePost={(updatedPost) => {
              setSelectedPost(updatedPost);
            }}
          />
        )}
      </main>

      {/* Persistent humble footer info */}
      <footer className="py-6 border-t border-orange-100/30 text-center text-[10px] text-gray-400 font-sans tracking-wide">
        &copy; {new Date().getFullYear()} NongBot. All Rights Reserved. Crafted with Google Studio Environment.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Sparkles, LogOut, LayoutDashboard, MessageSquarePlus, ShieldCheck, Zap, PlusCircle } from "lucide-react";

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView }) => {
  const { user, logout, addCredits } = useAuth();
  const [addingCredits, setAddingCredits] = useState(false);

  const handleSimulateAddCredits = async () => {
    if (!user) return;
    setAddingCredits(true);
    await addCredits(20);
    setAddingCredits(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-xs px-4 md:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => setView("dashboard")} 
          className="flex items-center gap-2 cursor-pointer group"
          id="nav-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-display font-bold shadow-lg shadow-orange-100 group-hover:scale-105 transition-transform">
            NB
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 flex items-center gap-1.5">
              NongBot <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full font-sans flex items-center gap-1.5" title="น้องบอทสัญชาติไทย 🇹🇭">
                <span>น้องบอท 🍊</span>
                <svg className="w-4 h-2.5 rounded-xs inline-block shadow-2xs border border-orange-100/70" viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg">
                  <rect width="9" height="6" fill="#FFFFFF"/>
                  <rect width="9" height="1" fill="#A51931"/>
                  <rect y="5" width="9" height="1" fill="#A51931"/>
                  <rect y="2" width="9" height="2" fill="#2D2A4A"/>
                </svg>
              </span>
            </h1>
            <p className="text-[10px] font-sans text-slate-400 font-medium">AI Sales Content Assistant</p>
          </div>
        </div>

        {/* Navigation Actions */}
        {user && (
          <div className="flex items-center gap-1 md:gap-3">
            <button
              onClick={() => setView("dashboard")}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider transition-all border ${
                currentView === "dashboard"
                  ? "bg-orange-550 border-orange-650 text-white shadow-md shadow-orange-200/50"
                  : "text-slate-550 border-transparent hover:bg-slate-50 hover:text-slate-800"
              }`}
              id="btn-nav-dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">หน้าแรก</span>
            </button>

            <button
              onClick={() => setView("generator")}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider transition-all border ${
                currentView === "generator"
                  ? "bg-orange-550 border-orange-650 text-white shadow-md shadow-orange-200/50"
                  : "text-slate-550 border-transparent hover:bg-slate-50 hover:text-slate-800"
              }`}
              id="btn-nav-generator"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>สร้างโพสต์ใหม่</span>
            </button>

            {user.email === "jorradol@gmail.com" && (
              <button
                onClick={() => setView("admin")}
                className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider transition-all border ${
                  currentView === "admin"
                    ? "bg-orange-550 border-orange-650 text-white shadow-md shadow-orange-200/50"
                    : "text-slate-550 border-transparent hover:bg-slate-50 hover:text-slate-800"
                }`}
                id="btn-nav-admin"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ผู้ดูแลระบบ</span>
              </button>
            )}
          </div>
        )}

        {/* User Info & Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* Credits badge with rapid helper */}
            <div 
              className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full pl-3 pr-1 py-1 text-xs text-orange-700 font-bold shadow-2xs"
              title="ระบบเครดิตใช้งาน NongBot"
            >
              <Zap className="w-3.5 h-3.5 text-orange-500 animate-pulse fill-orange-300" />
              <span>{user.credits} เครดิต</span>
              
              <button
                onClick={handleSimulateAddCredits}
                disabled={addingCredits}
                className="ml-1 p-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer"
                title="จำลองการเติม 20 เครดิต"
              >
                <PlusCircle className="w-3 h-3" />
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-slate-500 transition-colors cursor-pointer shadow-2xs"
              title="ออกจากระบบ"
              id="btn-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-200 px-3 py-1.5 rounded-full">SME Best Assistant</span>
          </div>
        )}
      </div>
    </header>
  );
};

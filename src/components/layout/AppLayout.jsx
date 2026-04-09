import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);

  // Cargamos un usuario falso temporalmente para que la interfaz no tire error.
  // Cuando armemos el backend en Python, conectaremos esto de verdad.
  useEffect(() => {
    setUser({ full_name: "Admin", email: "admin@glorbi.com" });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        user={user}
      />
      <main
        className="transition-all duration-200 ease-in-out"
        style={{ marginLeft: collapsed ? 64 : 240 }}
      >
        {/* Header bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-8 border-b border-border bg-background/80 backdrop-blur-md">
          <div>
            <h1 className="text-lg font-mono font-medium text-foreground tracking-tight">
              ◈ glorbi
            </h1>
            <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-[3px]">
              Institutional Portfolio Analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs font-mono text-muted-foreground">
                {user.full_name || user.email}
              </span>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green/10 border border-green/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green animate-blink" />
              <span className="text-[10px] font-mono text-green tracking-wider">LIVE</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 md:p-8 max-w-screen-2xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
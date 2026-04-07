import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Newspaper,
  Radio,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/market-pulse", label: "Market Pulse", icon: Activity },
  { path: "/news", label: "News & Signals", icon: Newspaper },
  { path: "/screener", label: "Screener", icon: BarChart3 },
];

export default function Sidebar({ collapsed, onToggle, user }) {
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border"
    >
      {/* Brand */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-xl font-mono font-medium text-foreground tracking-tighter">
                ◈ glorbi
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <span className="text-lg font-mono text-foreground mx-auto">◈</span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* User card */}
      {!collapsed && user && (
        <div className="mx-3 mt-3 p-3 rounded-lg bg-secondary border border-border">
          <div className="text-sm font-mono text-foreground truncate">
            {user.full_name || user.email}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-green">
              {user.role === "admin" ? "ADMIN" : "USER"}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-150
                ${isActive
                  ? "bg-sidebar-accent text-foreground border border-border"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border border-transparent"
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 space-y-1">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all border border-transparent"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Ajustes</span>}
        </Link>
        <button
          onClick={() => base44.auth.logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-red hover:bg-red/5 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Salir</span>}
        </button>
        {!collapsed && (
          <p className="px-3 pt-2 text-[10px] font-mono text-muted-foreground/40 tracking-wide">
            Solo lectura · Nunca ejecuta órdenes
          </p>
        )}
      </div>
    </motion.aside>
  );
}
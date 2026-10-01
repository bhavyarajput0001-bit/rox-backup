"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Settings,
  MonitorSmartphone,
  Brain,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Chat", icon: MessageSquare },
  { href: "/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function NavTaskbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("rox_email");
    setUser(email);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("rox_token");
    localStorage.removeItem("rox_user");
    localStorage.removeItem("rox_email");
    window.location.href = "/login";
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 rox-taskbar">
      <div className="flex items-center justify-between px-4 h-14 glass-panel border-b border-rox/border">
        {/* Left: logo + hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-rox/bright"
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/" className="flex items-center gap-2 group">
            <Brain size={24} className="text-rox/bright group-hover:rotate-12 transition-transform" />
            <span className="text-lg font-bold tracking-widest text-rox/bright glow-text">ROX</span>
          </Link>
        </div>

        {/* Center: nav links */}
        <div className={`${open ? "flex" : "hidden"} md:flex absolute md:static top-14 left-0 right-0 flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 bg-black/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-4 md:p-0 border-b md:border-0 border-rox/border`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all w-full md:w-auto ${
                  active
                    ? "bg-rox/bright/20 text-rox/bright border border-rox/bright/40"
                    : "text-rox/gray hover:text-rox/bright hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right: user + logout */}
        <div className="flex items-center gap-2">
          {user ? (
            <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-rox/bright/80 bg-rox/bright/10 border border-rox/bright/20">
              <Brain size={14} />
              {user.split("@")[0]}
            </span>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg text-xs text-rox/bright bg-rox/bright/10 border border-rox/bright/20 hover:bg-rox/bright/20 transition-all"
            >
              Login
            </Link>
          )}
          {user && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-rox/gray hover:text-red-400 hover:bg-red-500/10 transition-all"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
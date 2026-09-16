import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavTaskbar from "@/components/NavTaskbar";
import SystemTray from "@/components/SystemTray";
import LeftTaskbar from "@/components/LeftTaskbar";
import BottomController from "@/components/BottomController";
import { getAppMode } from "@/lib/appModes";

export const metadata: Metadata = {
  title: "Rox — Neural Orbital Interface",
  description: "Your AI assistant with holographic orb interface",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize mode from localStorage on server
  const initialMode = getAppMode();
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={initialMode !== 'focus' ? `app-mode-${initialMode}` : ''}>
        {/* Left Taskbar - Mode switcher & nav */}
        <LeftTaskbar />
        
        {/* Top Navigation */}
        <NavTaskbar />
        
        {/* Main Content Area */}
        <main className="pt-14 pb-10 pl-16 rox-shell">
          {children}
        </main>
        
        {/* Bottom Controller - Media & system controls */}
        <BottomController />
        
        {/* System Tray - Right side */}
        <SystemTray />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavTaskbar from "@/components/NavTaskbar";
import SystemTray from "@/components/SystemTray";

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NavTaskbar />
        <main className="pt-14 pb-10 rox-shell">{children}</main>
        <SystemTray />
      </body>
    </html>
  );
}
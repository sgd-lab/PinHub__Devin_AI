import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CostMeter } from "@/components/layout/CostMeter";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PinHub — Atelier Workspace",
  description: "Private Pinterest Content OS for Maya Sofia",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans bg-warm-ivory text-deep-espresso antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <div className="flex h-screen overflow-hidden">
              <div className="hidden sm:block">
                <Sidebar />
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
                  {children}
                </main>
              </div>
            </div>
            <MobileBottomNav />
            <CostMeter />
            <CommandPalette />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

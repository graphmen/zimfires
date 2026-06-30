import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ZimFireWatch",
  description: "Robust near real-time fire watch system for Zimbabwe",
  icons: {
    icon: "/zingsa-logo.png",
  },
};

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopHeader } from "@/components/top-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppFooter } from "@/components/app-footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>
          <SidebarProvider defaultOpen={false}>
            <AppSidebar />
            <SidebarInset className="flex flex-col">
              <TopHeader />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
              <AppFooter />
            </SidebarInset>
          </SidebarProvider>
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}

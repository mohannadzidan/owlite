import { Geist_Mono, Indie_Flower, Inter, Lato, Patrick_Hand } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";
import { CursorOverlay } from "@/components/remote/cursor-overlay";
import { RemoteControlProvider } from "@/components/remote/remote-control-provider";
import { Toaster } from "@/components/ui/sonner";
import { ProfileGuard } from "@/components/profile-guard";

const fontSans = Lato({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "700", "900"],
});

const fontSerif = Patrick_Hand({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400"],
});
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata = {
  title: "Owlite",
  description: "Watch some",
};
// Detects flex gap support before first paint. Creates a flex column with row-gap:1px
// and two empty children; if  scrollHeight stays 0 the browser ignores flex gap
// (Chrome < 84) and we add .no-flex-gap to enable the margin-based CSS fallbacks.
const flexGapDetect = `(function(){var e=document.createElement("div");e.style.cssText="position:fixed;visibility:hidden;display:flex;flex-direction:column;row-gap:1px;";e.innerHTML="<div></div><div></div>";document.documentElement.appendChild(e);if(e.scrollHeight!==1)document.documentElement.classList.add("no-flex-gap");document.documentElement.removeChild(e);})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: flexGapDetect }} />
      </head>
      <body
        className={cn(
          "flex flex-col bg-background text-foreground min-h-screen select-none antialiased",
          fontSans.variable,
          fontSerif.variable,
          fontMono.variable,
        )}
      >
        <RemoteControlProvider>
          <ProfileGuard>
            <Toaster />
            {children}
            <CursorOverlay />
          </ProfileGuard>
        </RemoteControlProvider>
      </body>
    </html>
  );
}

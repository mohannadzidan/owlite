import { Geist_Mono, Inter } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

// Detects flex gap support before first paint. Creates a flex column with row-gap:1px
// and two empty children; if scrollHeight stays 0 the browser ignores flex gap
// (Chrome < 84) and we add .no-flex-gap to enable the margin-based CSS fallbacks.
const flexGapDetect = `(function(){var e=document.createElement("div");e.style.cssText="position:fixed;visibility:hidden;display:flex;flex-direction:column;row-gap:1px;";e.innerHTML="<div></div><div></div>";document.documentElement.appendChild(e);if(e.scrollHeight!==1)document.documentElement.classList.add("no-flex-gap");document.documentElement.removeChild(e);})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("antialiased", fontMono.variable, inter.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: flexGapDetect }} />
      </head>
      <body className="flex flex-col bg-background text-foreground min-h-screen select-none">{children}</body>
    </html>
  );
}

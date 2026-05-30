import { Geist_Mono, Inter } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AspectRatioGuard } from "@/components/aspect-ratio-guard";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("dark antialiased", fontMono.variable, inter.variable)}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground h-screen overflow-hidden">
        <ThemeProvider>
          <AspectRatioGuard>{children}</AspectRatioGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}

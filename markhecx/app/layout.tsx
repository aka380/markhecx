import type { Metadata } from "next";
import "./globals.css";
import "./phase2.css";
import "./phase3.css";
import "./phase4.css";
import "./phase5.css";
import { MarketplaceProvider } from "@/components/mark/marketplace/provider";
import { AppProvider } from "@/components/mark/provider";
import { WebMcp } from "@/components/mark/webmcp";
import { Shell } from "@/components/mark/shell";

export const metadata: Metadata = {
  title: "MarkHECX — Your creative identity",
  description:
    "Discover creators, shape your portfolio, and explore your next chapter with HECX.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <AppProvider>
          <MarketplaceProvider>
            <WebMcp />
            <Shell>{children}</Shell>
          </MarketplaceProvider>
        </AppProvider>
      </body>
    </html>
  );
}

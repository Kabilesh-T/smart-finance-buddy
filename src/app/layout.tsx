import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Buddy",
  description: "A modern personal finance tracker.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html
        lang="en"
        className={cn("dark", GeistSans.variable, GeistMono.variable)}
        suppressHydrationWarning
      >
        <body className="font-sans bg-background text-foreground min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  );
}

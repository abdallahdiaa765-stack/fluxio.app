import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { DevCredit } from "@/components/layout/dev-credit";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fluxio - Run Your Restaurant Smarter",
  description: "Complete restaurant management system with POS, Kitchen Display, Inventory, and Analytics",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <DevCredit />
        </ThemeProvider>
      </body>
    </html>
  );
}

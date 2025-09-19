import UserMenu from "@/components/auth/UserMenu";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import QueryProvider from "./query-provider";

export const metadata: Metadata = {
  title: "Home Manager • Expense",
  description: "Next.js + shadcn/ui + TanStack Query + Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <Providers>
            {/* User menu shown only when a session exists */}
            <UserMenu />
            {children}
            <Toaster richColors closeButton />
          </Providers>
        </QueryProvider>
      </body>
    </html>
  );
}

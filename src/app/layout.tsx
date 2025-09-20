import UserMenu from "@/components/auth/UserMenu";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

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
        <Providers>
          <UserMenu />
          {children}
          <Toaster richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}

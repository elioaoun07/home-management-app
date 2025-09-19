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
        {/* Wrap once, in a single tree */}
        <QueryProvider>
          <Providers>
            {children}
            <Toaster richColors closeButton />
          </Providers>
        </QueryProvider>
      </body>
    </html>
  );
}

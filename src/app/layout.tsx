import UserMenu from "@/components/auth/UserMenu";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Home Manager • Expense",
  description: "Next.js + shadcn/ui + TanStack Query + Supabase",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Early theme apply to avoid flash of incorrect theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var stored = localStorage.getItem('hm-theme');
                  var theme = stored || 'system';
                  var d = document.documentElement;
                  if (theme === 'system') {
                    var m = window.matchMedia('(prefers-color-scheme: dark)');
                    if (m.matches) d.classList.add('dark');
                    else d.classList.remove('dark');
                  } else if (theme === 'dark') {
                    d.classList.add('dark');
                  } else {
                    d.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <Providers>
          <UserMenu />
          {children}
          <Toaster richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}

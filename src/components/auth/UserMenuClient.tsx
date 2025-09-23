"use client";

import SettingsDialog from "@/components/settings/SettingsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@supabase/supabase-js";
import {
  LogOut,
  Settings as SettingsIcon,
  User as UserIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LinkHouseholdDialog from "./LinkHouseholdDialog";

type Props = {
  name: string;
  email: string;
  avatarUrl?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UserMenuClient({ name, email, avatarUrl }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  // Redirect to onboarding walkthrough for new users (except on auth/welcome routes)
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (
        pathname === "/login" ||
        pathname.startsWith("/reset-password") ||
        pathname === "/welcome" ||
        pathname.startsWith("/auth/")
      ) {
        return;
      }
      try {
        const res = await fetch("/api/onboarding", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!ignore && data && data.completed === false) {
          router.replace("/welcome");
        }
      } catch {}
    })();
    return () => {
      ignore = true;
    };
  }, [pathname, router]);

  // Never show the menu on auth pages
  if (pathname === "/login" || pathname.startsWith("/reset-password")) {
    return null;
  }

  const initials = name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    // 1) Clear server-side cookies
    await fetch("/api/auth/signout", { method: "POST", cache: "no-store" });

    // 2) Also clear client-side session
    await supabase.auth.signOut();

    // 3) Navigate and refresh to drop any cached server components
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="fixed top-3 right-3 z-50">
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <LinkHouseholdDialog open={linkOpen} onOpenChange={setLinkOpen} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Avatar className="h-7 w-7">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name} />
              ) : (
                <AvatarFallback className="text-xs">
                  {initials || <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium truncate max-w-[160px]">
              {name}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
          <div className="px-2 pb-1 text-xs text-muted-foreground truncate">
            {email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLinkOpen(true)}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Link household</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

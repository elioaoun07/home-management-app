// Server component
import { supabaseServer } from "@/lib/supabase/server";
import UserMenuClient from "./UserMenuClient";

export default async function UserMenu() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    user.email ??
    "User";

  const avatarUrl =
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    null;

  return (
    <UserMenuClient
      name={name}
      email={user.email ?? ""}
      avatarUrl={avatarUrl ?? undefined}
    />
  );
}

import { NextResponse } from "next/server";

export async function GET() {
  const url = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = !!process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  const devUser = !!process.env.DEV_USER_ID;

  return NextResponse.json({
    urlSet: url,
    anonSet: anon,
    serviceSet: service,
    devUserSet: devUser,
  });
}

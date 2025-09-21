"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

// Page component: wraps the part that reads search params in <Suspense>
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
      <LoginContent />
    </Suspense>
  );
}

// Inner component: actually uses useSearchParams (now inside Suspense)
function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (!errorParam) return;
    const message =
      errorParam === "missing"
        ? "Please enter email and password."
        : errorParam === "invalid"
          ? "Invalid email or password."
          : "Something went wrong. Please try again.";
    toast.error(message);
  }, [errorParam]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    if (!username.trim() || !password) {
      e.preventDefault();
      toast.error("Please enter username and password");
      return;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Sign in</h2>

        {errorParam && (
          <div
            role="alert"
            className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorParam === "missing" && "Please enter email and password."}
            {errorParam === "invalid" && "Invalid email or password."}
            {errorParam === "internal" &&
              "Something went wrong. Please try again."}
          </div>
        )}

        <form
          onSubmit={submit}
          action="/api/auth/login"
          method="post"
          className="space-y-4"
        >
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Button asChild variant="link" size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
              <Button asChild variant="link" size="sm">
                <Link href="/reset-password">Forgot password?</Link>
              </Button>
            </div>
            <Button type="submit">Sign in</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

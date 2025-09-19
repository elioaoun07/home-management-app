"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import React, { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    // If fields are empty, prevent the normal form submission and show toast.
    if (!username.trim() || !password) {
      e.preventDefault();
      toast.error("Please enter username and password");
      return;
    }
    // Allow the browser to submit the form normally. The server will set cookies
    // and respond with an HTTP redirect which the browser will follow.
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Sign in</h2>
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

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");

  // Show query-based messages client-side
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sent")) {
      toast.success("Password reset email sent. Check your inbox.");
    }
    if (params.get("error")) {
      toast.error(params.get("error") || "Error sending reset email");
    }
  }, []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    if (!email.trim()) {
      e.preventDefault();
      toast.error("Please enter your email");
      return;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Reset password</h2>
        <form
          onSubmit={submit}
          action="/api/auth/reset-password"
          method="post"
          className="space-y-4"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
            />
          </div>
          <div className="flex items-center justify-between">
            <Link href="/login" className="text-sm text-muted-foreground">
              Back to login
            </Link>
            <Button type="submit">Send reset email</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

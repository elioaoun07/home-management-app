"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

export default function WelcomeClient() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [enterCode, setEnterCode] = useState("");

  useEffect(() => {
    // ensure fresh state
    setError(null);
  }, []);

  async function chooseIndividual() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_type: "individual" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      window.location.href = "/dashboard";
    } catch (e: any) {
      setError(e?.message || "Failed to continue");
    } finally {
      setSubmitting(false);
    }
  }

  async function generateHouseholdCode() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_type: "household" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to generate");
      setGeneratedCode(data?.code || null);
    } catch (e: any) {
      setError(e?.message || "Failed to generate code");
    } finally {
      setSubmitting(false);
    }
  }

  async function claimHouseholdCode() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/household/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: enterCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to link");
      // Mark onboarding completed as household for the partner WITHOUT triggering owner code creation
      const res2 = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_type: "household" }),
      });
      const d2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error(d2?.error || "Failed to finalize");
      window.location.href = "/dashboard";
    } catch (e: any) {
      setError(e?.message || "Failed to link");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg p-6">
      <h1 className="text-2xl font-semibold mb-2">Welcome</h1>
      <p className="text-muted-foreground mb-6">
        Choose how you want to use the app. You can switch later in Settings.
      </p>

      {error ? (
        <div className="text-sm text-red-600 mb-4">
          {error}
          {/Unauthorized/i.test(error) ? (
            <>
              {" "}
              <Button
                variant="link"
                className="px-1"
                onClick={() => (window.location.href = "/login")}
              >
                Go to login
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Individual option */}
      <section className="rounded-md border p-4 mb-4">
        <h3 className="font-medium mb-2">Use as an Individual</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Keep things simple with a personal account.
        </p>
        <Button onClick={chooseIndividual} disabled={submitting}>
          Continue as individual
        </Button>
      </section>

      {/* Household option */}
      <section className="rounded-md border p-4 space-y-6">
        <h3 className="font-medium">Use as a Household</h3>

        <div className="space-y-3">
          <div>
            <div className="font-medium mb-1">I am the household manager</div>
            <p className="text-sm text-muted-foreground mb-3">
              Generate a one-time code and share it with your partner.
            </p>
            {generatedCode ? (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">Your code</div>
                <div className="font-mono text-xl tracking-widest">
                  {generatedCode}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedCode!);
                      } catch {}
                    }}
                  >
                    Copy code
                  </Button>
                  <Button onClick={() => (window.location.href = "/dashboard")}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={generateHouseholdCode} disabled={submitting}>
                Generate code
              </Button>
            )}
          </div>

          <div className="pt-2">
            <div className="font-medium mb-1">I have a code</div>
            <div className="space-y-2">
              <Label htmlFor="code">Enter code</Label>
              <Input
                id="code"
                value={enterCode}
                onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7K4B2Q"
              />
              <Button
                onClick={claimHouseholdCode}
                disabled={submitting || enterCode.length < 4}
              >
                Link household
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

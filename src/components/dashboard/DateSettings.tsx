"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  startOfCustomMonth,
  startOfQuarter,
  startOfWeek,
  toISODate,
  useDatePreferences,
} from "@/features/preferences/useDatePreferences";
import { CalendarRange, Settings2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function DateSettings() {
  const { prefs, update, loaded } = useDatePreferences();
  const [openPrefs, setOpenPrefs] = useState(false);
  const [openQuick, setOpenQuick] = useState(false);

  function applyRange(start: Date, end: Date) {
    const s = toISODate(start);
    const e = toISODate(end);
    setOpenQuick(false);
    // Broadcast to dashboard client to filter locally without a page reload
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dashboard:setRange", { detail: { start: s, end: e } })
      );
    }
  }

  const now = useMemo(() => new Date(), []);

  // Auto-apply current custom month range on first load if user didn't set URL params
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (!loaded || autoAppliedRef.current) return;
    try {
      const url = new URL(window.location.href);
      const hasParams =
        url.searchParams.has("start") || url.searchParams.has("end");
      if (hasParams) return; // respect explicit filters
      // Compute current custom month window
      const s = startOfCustomMonth(now, prefs.month_start_day);
      const next = new Date(s);
      next.setMonth(next.getMonth() + 1);
      next.setDate(prefs.month_start_day);
      const end = new Date(next);
      end.setDate(end.getDate() - 1);
      applyRange(s, end);
      autoAppliedRef.current = true;
    } catch {}
  }, [loaded, prefs.month_start_day, now]);

  const presets = [
    {
      label: "This week",
      run: () => {
        const s = startOfWeek(now, prefs.week_start);
        const e = new Date(s);
        e.setDate(e.getDate() + 6); // 7-day window
        applyRange(s, e);
      },
    },
    {
      label: "This month",
      run: () => {
        const s = startOfCustomMonth(now, prefs.month_start_day);
        const next = new Date(s);
        next.setMonth(next.getMonth() + 1);
        next.setDate(prefs.month_start_day);
        const end = new Date(next);
        end.setDate(end.getDate() - 1);
        applyRange(s, end);
      },
    },
    {
      label: "Last month",
      run: () => {
        const sThis = startOfCustomMonth(now, prefs.month_start_day);
        const sPrev = new Date(sThis);
        sPrev.setMonth(sPrev.getMonth() - 1);
        const endPrev = new Date(sThis);
        endPrev.setDate(endPrev.getDate() - 1);
        applyRange(sPrev, endPrev);
      },
    },
    {
      label: "This quarter",
      run: () => {
        const s = startOfQuarter(now);
        applyRange(s, now);
      },
    },
    {
      label: "This year",
      run: () => {
        const s = new Date(now.getFullYear(), 0, 1);
        applyRange(s, now);
      },
    },
  ];

  return (
    <div className="flex items-end gap-1">
      {/* Preferences popover */}
      <Popover open={openPrefs} onOpenChange={setOpenPrefs}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Date preferences"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium">Date preferences</div>
              <div className="text-xs text-muted-foreground">
                These presets will respect your start days.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Week starts on</Label>
                <RadioGroup
                  value={prefs.week_start}
                  onValueChange={(v) => {
                    const nextWk = (v as any) || "sun";
                    update({ week_start: nextWk });
                    // Immediately reflect the new week range
                    const s = startOfWeek(new Date(), nextWk);
                    const e = new Date(s);
                    e.setDate(e.getDate() + 6);
                    applyRange(s, e);
                  }}
                  className="flex gap-2"
                >
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <RadioGroupItem id="wk-sun" value="sun" />
                    <Label htmlFor="wk-sun" className="cursor-pointer">
                      Sunday
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <RadioGroupItem id="wk-mon" value="mon" />
                    <Label htmlFor="wk-mon" className="cursor-pointer">
                      Monday
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Month starts on</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={prefs.month_start_day}
                    onChange={(e) => {
                      const nextDay = Math.max(
                        1,
                        Math.min(28, Number(e.target.value) || 1)
                      );
                      update({ month_start_day: nextDay });
                      // Immediately reflect the new custom month in the filters
                      const current = new Date();
                      const s = startOfCustomMonth(current, nextDay);
                      const next = new Date(s);
                      next.setMonth(next.getMonth() + 1);
                      next.setDate(nextDay);
                      const end = new Date(next);
                      end.setDate(end.getDate() - 1);
                      applyRange(s, end);
                    }}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">
                    day of month
                  </span>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick views popover (separate) */}
      <Popover open={openQuick} onOpenChange={setOpenQuick}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Quick views"
          >
            <CalendarRange className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant="secondary"
                onClick={p.run}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

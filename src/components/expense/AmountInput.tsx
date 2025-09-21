"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";
import { ReactNode, useState } from "react";
import CalculatorDialog from "./CalculatorDialog";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  rightExtra?: ReactNode; // Optional extra control (e.g., voice entry)
};

export default function AmountInput({ value, onChange, rightExtra }: Props) {
  const [isCalcOpen, setCalcOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor="amount">Amount</Label>
      <div className="flex items-center gap-2">
        <Input
          id="amount"
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          aria-label="Open calculator"
          onClick={() => setCalcOpen(true)}
        >
          <Calculator className="h-4 w-4" />
        </Button>
        {rightExtra}
      </div>

      <CalculatorDialog
        open={isCalcOpen}
        onOpenChange={setCalcOpen}
        onResult={(result) => {
          onChange?.(result);
          setCalcOpen(false);
        }}
        initialValue={value || "0"}
      />
    </div>
  );
}

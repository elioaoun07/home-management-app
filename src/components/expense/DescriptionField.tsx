"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export default function DescriptionField({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="description">Description (Optional)</Label>
      <Textarea
        id="description"
        placeholder="What was this for?"
        rows={3}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

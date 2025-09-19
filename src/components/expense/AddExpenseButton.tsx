"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

type Props = {
  disabled?: boolean;
  onSubmit?: () => Promise<void>;
};

export default function AddExpenseButton({ disabled = true, onSubmit }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async () => {
    if (!onSubmit || disabled) return;

    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      console.error("Error submitting expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      disabled={disabled || isSubmitting}
      onClick={handleClick}
      className="w-full"
    >
      {isSubmitting ? "Adding..." : "Add Expense"}
    </Button>
  );
}

"use client";

import ExpenseShell from "@/components/layouts/ExpenseShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExpenseShell>{children}</ExpenseShell>;
}

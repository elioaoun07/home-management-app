import ExpenseShell from "@/components/layouts/ExpenseShell";

export default function ExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExpenseShell>{children}</ExpenseShell>;
}

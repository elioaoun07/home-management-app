import ExpenseForm from "@/components/expense/ExpenseForm";

export const metadata = {
  title: "Quick Expense",
};

export default function QuickExpensePage() {
  return (
    <div className="container mx-auto max-w-2xl py-6">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">
        Quick Expense
      </h1>
      <ExpenseForm />
    </div>
  );
}

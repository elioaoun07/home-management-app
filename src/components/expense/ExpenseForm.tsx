"use client";

import { useSectionOrder } from "@/features/preferences/useSectionOrder";
import TemplateQuickEntryButton, { Template } from "./TemplateQuickEntryButton";

import { useEffect, useMemo, useState, type JSX } from "react";
import { toast } from "sonner";
import AccountSelect from "./AccountSelect";
import AddExpenseButton from "./AddExpenseButton";
import AmountInput from "./AmountInput";
import CategoryGrid from "./CategoryGrid";
import DescriptionField from "./DescriptionField";
import SubcategoryGrid from "./SubcategoryGrid";

const SECTION_KEYS = [
  "account",
  "category",
  "subcategory",
  "amount",
  "description",
] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

export default function ExpenseForm() {
  const { data: sectionOrderRaw, isLoading: sectionOrderLoading } =
    useSectionOrder();
  const sectionOrder: SectionKey[] = Array.isArray(sectionOrderRaw)
    ? sectionOrderRaw.filter((s): s is SectionKey => SECTION_KEYS.includes(s))
    : SECTION_KEYS.slice();
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>();
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // When category changes, clear subcategory
  useEffect(() => {
    setSelectedSubcategoryId(undefined);
  }, [selectedCategoryId]);

  // Check if form is valid for submission
  const isFormValid =
    selectedAccountId && selectedCategoryId && amount && parseFloat(amount) > 0;

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: selectedAccountId,
          category_id: selectedCategoryId,
          subcategory_id: selectedSubcategoryId || null,
          amount: amount,
          description: description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create transaction");
      }

      const transaction = await response.json();
      console.log("Transaction created:", transaction);

      toast.success("Expense added successfully!");

      // Reset form
      setSelectedAccountId(undefined);
      setSelectedCategoryId(undefined);
      setSelectedSubcategoryId(undefined);
      setAmount("");
      setDescription("");
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add expense"
      );
    }
  };

  const sectionComponents: Record<SectionKey, JSX.Element> = useMemo(
    () => ({
      account: (
        <AccountSelect
          value={selectedAccountId}
          onChange={setSelectedAccountId}
          key="account"
        />
      ),
      category: (
        <CategoryGrid
          accountId={selectedAccountId}
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={setSelectedCategoryId}
          key="category"
        />
      ),
      subcategory: (
        <SubcategoryGrid
          accountId={selectedAccountId}
          parentCategoryId={selectedCategoryId}
          selectedSubcategoryId={selectedSubcategoryId}
          onSubcategorySelect={setSelectedSubcategoryId}
          key="subcategory"
        />
      ),
      amount: <AmountInput value={amount} onChange={setAmount} key="amount" />,
      description: (
        <DescriptionField
          value={description}
          onChange={setDescription}
          key="description"
        />
      ),
    }),
    [
      selectedAccountId,
      selectedCategoryId,
      selectedSubcategoryId,
      amount,
      description,
    ]
  );

  // Handle template selection: populate all fields except amount/description
  const handleTemplateSelect = (tpl: Template) => {
    setSelectedAccountId(tpl.account_id);
    setSelectedCategoryId(tpl.category_id);
    setSelectedSubcategoryId(tpl.subcategory_id || undefined);
    setAmount(tpl.amount);
    setDescription(""); // Let user enter their own description
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Quick Expense</h1>
      </header>
      {sectionOrderLoading ? (
        <div>Loading preferences...</div>
      ) : (
        sectionOrder.map((section) => (
          <section key={section}>{sectionComponents[section]}</section>
        ))
      )}
      <section>
        <AddExpenseButton disabled={!isFormValid} onSubmit={handleSubmit} />
      </section>
      <TemplateQuickEntryButton
        onTemplateSelect={handleTemplateSelect}
        onCreateTemplate={() => {}}
        onEditTemplate={() => {}}
      />
    </div>
  );
}

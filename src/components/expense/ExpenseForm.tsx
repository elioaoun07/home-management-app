"use client";

import { useSectionOrder } from "@/features/preferences/useSectionOrder";
import TemplateQuickEntryButton, { Template } from "./TemplateQuickEntryButton";

import { useCategories } from "@/features/categories/useCategoriesQuery";
import { parseSpeechExpense } from "@/lib/nlp/speechExpense";
import { useEffect, useMemo, useState, type JSX } from "react";
import { toast } from "sonner";
import AccountSelect from "./AccountSelect";
import AddExpenseButton from "./AddExpenseButton";
import AmountInput from "./AmountInput";
import CategoryGrid from "./CategoryGrid";
import DescriptionField from "./DescriptionField";
import SubcategoryGrid from "./SubcategoryGrid";
import VoiceEntryButton from "./VoiceEntryButton";

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
  const [pendingSentence, setPendingSentence] = useState<string | null>(null);

  // Categories for NLP matching
  const { data: categories = [] } = useCategories(selectedAccountId);

  // Helper: get parent category id for a subcategory
  const getParentForSub = (subId?: string) => {
    if (!subId) return undefined;
    // DB-flat: find item with this id and read parent_id
    for (const c of categories as any[]) {
      if (c && c.id === subId) {
        if ("parent_id" in c && c.parent_id) return c.parent_id as string;
        break;
      }
    }
    // Nested default: search subcategories
    for (const c of categories as any[]) {
      if (c?.subcategories) {
        const hit = c.subcategories.find((s: any) => s.id === subId);
        if (hit) return c.id as string;
      }
    }
    return undefined;
  };

  // When category changes, clear subcategory only if it doesn't belong to the new category
  useEffect(() => {
    if (!selectedCategoryId) {
      setSelectedSubcategoryId(undefined);
      return;
    }
    if (!selectedSubcategoryId) return;
    const parentId = getParentForSub(selectedSubcategoryId);
    if (parentId && parentId !== selectedCategoryId) {
      setSelectedSubcategoryId(undefined);
    }
  }, [selectedCategoryId, selectedSubcategoryId, categories]);

  // If we spoke while categories were still loading, re-parse when they arrive
  useEffect(() => {
    if (!pendingSentence) return;
    if (!categories || (categories as any[]).length === 0) return;
    const reparsed = parseSpeechExpense(pendingSentence, categories);
    if (reparsed.categoryId) setSelectedCategoryId(reparsed.categoryId);
    if (reparsed.subcategoryId)
      setSelectedSubcategoryId(reparsed.subcategoryId);
    if (reparsed.amount != null && !isNaN(reparsed.amount)) {
      // don’t override if user already typed an amount
      setAmount((prev) => (prev ? prev : String(reparsed.amount)));
    }
    if (reparsed.categoryId || reparsed.subcategoryId) setPendingSentence(null);
  }, [pendingSentence, categories]);

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
      amount: (
        <AmountInput
          value={amount}
          onChange={setAmount}
          rightExtra={
            <VoiceEntryButton
              categories={categories}
              onPreviewChange={() => {}}
              onParsed={({ sentence, amount, categoryId, subcategoryId }) => {
                setDescription(`[Speech] ${sentence}`);
                if (amount != null && !isNaN(amount)) setAmount(String(amount));
                if (categoryId) setSelectedCategoryId(categoryId);
                if (subcategoryId) setSelectedSubcategoryId(subcategoryId);
                // If nothing matched, queue re-parse once categories ready
                if (!categoryId && !subcategoryId) setPendingSentence(sentence);
              }}
              variant="icon"
            />
          }
          key="amount"
        />
      ),
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
      // speechPreview removed as per patch
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
      {/* Voice button moved next to Amount input */}
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

// Re-parse pending sentence whenever categories become available
// Placed after component to keep body above readable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useReparseOnCategories(
  pendingSentence: string | null,
  categories: any[],
  setters: {
    setSelectedCategoryId: (id?: string) => void;
    setSelectedSubcategoryId: (id?: string) => void;
    setAmount: (v: string) => void;
    clearPending: () => void;
  }
) {
  const {
    setSelectedCategoryId,
    setSelectedSubcategoryId,
    setAmount,
    clearPending,
  } = setters;
  // Use an effect in the main component instead; this is a placeholder to signal intent.
}

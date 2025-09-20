# API layer (server routes)

.\src\app\api\accounts\route.ts ← server endpoint for accounts.

# Frontend hooks (TanStack Query)

.\src\features\accounts\useAccountsQuery.ts ← fetching accounts.
.\src\features\accounts\useAccountMutations.ts ← create/update/delete accounts.

# UI components that depend on accounts

.\src\components\expense\AccountSelect.tsx ← dropdown / selection.
Possibly .\src\components\expense\ExpenseForm.tsx (if it integrates accounts).
Maybe also used in .\src\components\dashboard\TransactionsTable.tsx (if accounts are displayed there).

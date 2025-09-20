// src/types/domain.ts
export type UUID = string;

export type AccountType = "expense" | "income";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  inserted_at: string; // ISO
};

export interface Category {
  id: UUID;
  user_id: UUID;
  name: string;
  parent_id?: UUID | null;
  icon?: string | null;
  color?: string | null;
  position?: number | null;
  visible?: boolean | null;
}

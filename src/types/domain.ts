// src/types/domain.ts
export type UUID = string;

export interface Account {
  id: UUID;
  user_id: UUID;
  name: string;
  type: string;
}

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

export interface VaultEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string | null;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface VaultInput {
  title: string;
  username: string;
  password: string;
  url?: string | null;
  note?: string | null;
}

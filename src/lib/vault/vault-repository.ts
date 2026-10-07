import { db } from '@/lib/db/database';
import { VaultEntry, VaultInput } from '@/types/vault';
import { generateUUID } from '@/lib/utils/uuid';

/** Password vault entries — stored locally only, behind the PIN lock. */
export const vaultRepository = {
  async list(): Promise<VaultEntry[]> {
    const entries = await db.vault.toArray();
    return entries.sort((a, b) => a.title.localeCompare(b.title));
  },

  async create(input: VaultInput): Promise<VaultEntry> {
    const now = Date.now();
    const entry: VaultEntry = {
      id: generateUUID(),
      title: input.title,
      username: input.username,
      password: input.password,
      url: input.url ?? null,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now
    };
    await db.vault.add(entry);
    return entry;
  },

  async update(id: string, updates: Partial<VaultInput>): Promise<VaultEntry | undefined> {
    const existing = await db.vault.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    await db.vault.put(updated);
    return updated;
  },

  async remove(id: string): Promise<void> {
    await db.vault.delete(id);
  }
};

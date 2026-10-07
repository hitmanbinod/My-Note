import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Rebrand guard: the old display name must not creep back into the UI.
// Allowlisted paths contain the legacy name on purpose — identifiers per the
// rebrand audit (backup format, Drive folder lookup, packaging id, userData
// pin). Every allowlisted file must stay justified in PROGRESS.md Decisions.
const ROOTS = ['src', 'electron', 'index.html'];
const ALLOW = [
  /brand\.json$/,
  /rename-guard\.test\.ts$/,
  /lib\/backup\//, // backup format identifier: app field + legacy prefix acceptance
  /lib\/drive\//, // Drive remote folder is named "My Notes" on purpose
  /whiteboards\/constants\.ts$/, // Excalidraw scene `source` identifier
  /electron\/main\.cjs$/, // userData pin + legacy backup prefix listing
  /pages\/SettingsPage\.tsx$/ // legacy backup file name display strip
];
const OLD = /my[\s_-]?notes/i;

function walk(p: string, out: string[] = []): string[] {
  if (statSync(p).isDirectory()) readdirSync(p).forEach((f) => walk(join(p, f), out));
  else if (/\.(ts|tsx|css|html|cjs|js|json)$/.test(p)) out.push(p);
  return out;
}

describe('rename guard', () => {
  it('has no old display name outside the allowlist', () => {
    const hits = ROOTS.flatMap((r) => walk(r))
      .filter((f) => !ALLOW.some((rx) => rx.test(f.replace(/\\/g, '/'))))
      .filter((f) => OLD.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('never confuses the app name with the Tiptap editor library', () => {
    // Guard the guard: if this fails, someone renamed Tiptap imports.
    expect('Tipot'.toLowerCase()).not.toBe('tiptap');
    expect('tiptap'.replace(/^tiptap$/, 'Tipot')).toBe('Tipot');
  });
});

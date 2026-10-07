import { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/react';
import { getEditorExtensions } from '@/lib/editor/extensions';
import { noteService } from '@/services/NoteService';

/**
 * Import notes from popular apps and plain files:
 *  - Tipot backup JSON (restore lives in backup-service; this handles generic JSON too)
 *  - Evernote / UpNote ENEX exports
 *  - Markdown (.md/.markdown/.txt) — UpNote, Obsidian, Joplin, Notion markdown exports
 *  - HTML exports
 * Everything becomes real notes in the workspace, tagged "imported".
 */

export interface ImportResult {
  imported: number;
  skipped: number;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMd(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/** Minimal Markdown → HTML. Headings, lists, quotes, code fences, pipe tables, hr, emphasis, links. */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inCode = false;
  let listType: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const tableCells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => inlineMd(cell.trim()));

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (line.trim().startsWith('```')) {
      closeList();
      out.push(inCode ? '</code></pre>' : '<pre><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(`${escapeHtml(line)}\n`);
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      out.push(`<h${heading[1]!.length}>${inlineMd(heading[2]!)}</h${heading[1]!.length}>`);
      continue;
    }
    if (/^(\s*)[-*_]\s*$/.test(line)) {
      closeList();
      out.push('<hr>');
      continue;
    }
    // Pipe table: | a | b | plus a |---|---| separator on the next line
    if (/^\s*\|.*\|\s*$/.test(line) && index + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*$/.test(lines[index + 1] ?? '')) {
      const block: string[] = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index] ?? '')) {
        block.push(lines[index]!);
        index++;
      }
      index--;
      if (block.length >= 2) {
        closeList();
        const head = tableCells(block[0]!);
        const bodyRows = block.slice(2).map(tableCells);
        out.push(
          '<table><thead><tr>' + head.map((cell) => `<th>${cell}</th>`).join('') + '</tr></thead><tbody>' +
          bodyRows.map((row) => '<tr>' + row.map((cell) => `<td>${cell}</td>`).join('') + '</tr>').join('') +
          '</tbody></table>'
        );
        continue;
      }
    }
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul) {
      if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${inlineMd(ul[1]!)}</li>`);
      continue;
    }
    if (ol) {
      if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${inlineMd(ol[1]!)}</li>`);
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      out.push(`<blockquote>${inlineMd(quote[1]!)}</blockquote>`);
      continue;
    }
    closeList();
    if (line.trim()) out.push(`<p>${inlineMd(line)}</p>`);
  }
  closeList();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

function htmlToTiptap(html: string): JSONContent {
  const editor = new Editor({ extensions: getEditorExtensions(''), content: html || '<p></p>' });
  const json = editor.getJSON();
  editor.destroy();
  return json;
}

function domToEnmlHtml(noteEl: Element): string {
  const contentEl = noteEl.getElementsByTagName('content')[0];
  if (!contentEl) return '';
  let inner = contentEl.textContent ?? '';
  // ENML escapes entities and wraps in <?xml…><en-note>…</en-note> — strip the wrapper
  inner = inner.replace(/<\?xml[^>]*\?>/g, '').replace(/<\/?en-note[^>]*>/g, '');
  return inner;
}

function parseEnex(text: string): Array<{ title: string; html: string }> {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const notes: Array<{ title: string; html: string }> = [];
  for (const noteEl of Array.from(doc.getElementsByTagName('note'))) {
    const titleEl = noteEl.getElementsByTagName('title')[0];
    notes.push({
      title: (titleEl?.textContent ?? '').trim() || 'Imported note',
      html: domToEnmlHtml(noteEl)
    });
  }
  return notes;
}

export interface ImportSource {
  name: string;
  text: string;
}

export function extractNotesFromSource(source: ImportSource): Array<{ title: string; html: string }> {
  const lower = source.name.toLowerCase();
  const baseName = source.name.replace(/\.[^.]+$/, '') || 'Imported note';

  if (lower.endsWith('.json')) {
    // Our own backup or a generic [{title, content|html|text}] export
    try {
      const parsed = JSON.parse(source.text);
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.notes) ? parsed.notes : null;
      if (!list) return [{ title: baseName, html: `<pre>${escapeHtml(source.text.slice(0, 100_000))}</pre>` }];
      return list.slice(0, 2000).map((item: Record<string, unknown>, index: number) => ({
        title: String(item?.title ?? `${baseName} ${index + 1}`),
        html: typeof item?.html === 'string' ? item.html : `<p>${escapeHtml(String(item?.text ?? item?.content ?? ''))}</p>`
      }));
    } catch {
      return [{ title: baseName, html: `<pre>${escapeHtml(source.text.slice(0, 100_000))}</pre>` }];
    }
  }

  if (lower.endsWith('.enex')) return parseEnex(source.text);

  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    const doc = new DOMParser().parseFromString(source.text, 'text/html');
    const title = doc.querySelector('title')?.textContent?.trim() || baseName;
    const body = doc.body?.innerHTML ?? source.text;
    return [{ title, html: body }];
  }

  // .md / .markdown / .txt — one file, one note (UpNote/Obsidian/Notion exports)
  const md = source.text;
  const heading = /^#\s+(.+)$/m.exec(md);
  return [{ title: heading?.[1]?.trim() || baseName, html: markdownToHtml(md) }];
}

/** Imports a file's notes into the workspace. Returns how many were created. */
export async function importFromSource(source: ImportSource): Promise<ImportResult> {
  const notes = extractNotesFromSource(source);
  let imported = 0;
  for (const note of notes) {
    if (!note.html.trim() && !note.title.trim()) continue;
    const content = htmlToTiptap(`<h1>${escapeHtml(note.title)}</h1>${note.html}`);
    await noteService.createNote({
      title: note.title || 'Imported note',
      content,
      tags: ['imported']
    });
    imported++;
  }
  return { imported, skipped: notes.length - imported };
}

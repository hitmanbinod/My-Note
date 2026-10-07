import { generateUUID } from '@/lib/utils/uuid';

/**
 * Reader Mode — session-scoped annotations (highlights, pen strokes, text
 * notes) with a per-note undo stack.
 *
 * Per the reader-mode guide's build order, this phase keeps annotations in
 * memory for the current reading session; secure persistence through the
 * vault comes in a later phase. Highlights anchor as text offsets within the
 * rendered chapter; strokes and text boxes anchor in coordinates normalized
 * to the reading content box (0–1), so they track resizes of the same layout.
 */

export type ReaderHighlightColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'gray';

export interface ReaderMark {
  id: string;
  noteId: string;
  color: ReaderHighlightColor;
  start: number;
  end: number;
  text: string;
}

export interface ReaderStroke {
  id: string;
  noteId: string;
  color: string;
  width: number;
  /** Normalized 0–1 coordinates relative to the reading content box. */
  points: Array<{ x: number; y: number }>;
}

export interface ReaderTextNote {
  id: string;
  noteId: string;
  /** Normalized 0–1 coordinates relative to the reading content box. */
  x: number;
  y: number;
  text: string;
  color: ReaderHighlightColor;
}

const marksByNote = new Map<string, ReaderMark[]>();
const strokesByNote = new Map<string, ReaderStroke[]>();
const textsByNote = new Map<string, ReaderTextNote[]>();
const undoStacks = new Map<string, Array<() => void>>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function pushUndo(noteId: string, undo: () => void) {
  const stack = undoStacks.get(noteId) ?? [];
  stack.push(undo);
  undoStacks.set(noteId, stack);
}

export const readerAnnotations = {
  // ---- Highlights ----
  listMarks(noteId: string): ReaderMark[] {
    return marksByNote.get(noteId) ?? [];
  },
  addMark(mark: Omit<ReaderMark, 'id'>): void {
    const full: ReaderMark = { ...mark, id: generateUUID() };
    const list = marksByNote.get(full.noteId) ?? [];
    list.push(full);
    marksByNote.set(full.noteId, list);
    pushUndo(full.noteId, () => {
      marksByNote.set(full.noteId, (marksByNote.get(full.noteId) ?? []).filter((m) => m.id !== full.id));
    });
    emit();
  },
  removeMark(markId: string, noteId: string): void {
    const list = marksByNote.get(noteId);
    if (!list) return;
    const index = list.findIndex((mark) => mark.id === markId);
    if (index === -1) return;
    const [removed] = list.splice(index, 1);
    pushUndo(noteId, () => {
      marksByNote.set(noteId, [...(marksByNote.get(noteId) ?? []), removed!]);
    });
    emit();
  },
  removeMarkAtOffset(noteId: string, offset: number): boolean {
    const list = marksByNote.get(noteId) ?? [];
    const mark = list.find((m) => offset >= m.start && offset <= m.end);
    if (!mark) return false;
    this.removeMark(mark.id, noteId);
    return true;
  },

  // ---- Pen strokes ----
  listStrokes(noteId: string): ReaderStroke[] {
    return strokesByNote.get(noteId) ?? [];
  },
  addStroke(stroke: Omit<ReaderStroke, 'id'>): void {
    const full: ReaderStroke = { ...stroke, id: generateUUID() };
    const list = strokesByNote.get(full.noteId) ?? [];
    list.push(full);
    strokesByNote.set(full.noteId, list);
    pushUndo(full.noteId, () => {
      strokesByNote.set(full.noteId, (strokesByNote.get(full.noteId) ?? []).filter((s) => s.id !== full.id));
    });
    emit();
  },
  removeStroke(strokeId: string, noteId: string): void {
    const list = strokesByNote.get(noteId);
    if (!list) return;
    const index = list.findIndex((stroke) => stroke.id === strokeId);
    if (index === -1) return;
    const [removed] = list.splice(index, 1);
    pushUndo(noteId, () => {
      strokesByNote.set(noteId, [...(strokesByNote.get(noteId) ?? []), removed!]);
    });
    emit();
  },

  // ---- Text notes ----
  listTexts(noteId: string): ReaderTextNote[] {
    return textsByNote.get(noteId) ?? [];
  },
  addText(text: Omit<ReaderTextNote, 'id'>): string {
    const full: ReaderTextNote = { ...text, id: generateUUID() };
    const list = textsByNote.get(full.noteId) ?? [];
    list.push(full);
    textsByNote.set(full.noteId, list);
    pushUndo(full.noteId, () => {
      textsByNote.set(full.noteId, (textsByNote.get(full.noteId) ?? []).filter((t) => t.id !== full.id));
    });
    emit();
    return full.id;
  },
  updateText(textId: string, noteId: string, updates: Partial<Pick<ReaderTextNote, 'text' | 'x' | 'y' | 'color'>>): void {
    const list = textsByNote.get(noteId) ?? [];
    const index = list.findIndex((t) => t.id === textId);
    if (index === -1) return;
    list[index] = { ...list[index]!, ...updates };
    textsByNote.set(noteId, list);
    emit();
  },
  removeText(textId: string, noteId: string): void {
    const list = textsByNote.get(noteId);
    if (!list) return;
    const index = list.findIndex((t) => t.id === textId);
    if (index === -1) return;
    const [removed] = list.splice(index, 1);
    pushUndo(noteId, () => {
      textsByNote.set(noteId, [...(textsByNote.get(noteId) ?? []), removed!]);
    });
    emit();
  },

  // ---- Undo ----
  /** Undoes the last annotation action for the note. Returns true when something was undone. */
  undo(noteId: string): boolean {
    const stack = undoStacks.get(noteId);
    const undo = stack?.pop();
    if (!undo) return false;
    undo();
    emit();
    return true;
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }
};

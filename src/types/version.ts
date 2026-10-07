import { JSONContent } from '@tiptap/react';

/** A point-in-time snapshot of a note, captured before each content change. */
export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: JSONContent;
  plainTextContent: string;
  createdAt: number;
}

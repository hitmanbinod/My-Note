import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { common, createLowlight } from 'lowlight';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

/**
 * Get all Tiptap extensions for the editor
 */
export function getEditorExtensions(placeholder = 'Start writing...') {
  return [
    StarterKit.configure({
      codeBlock: false, // We'll use CodeBlockLowlight instead
      heading: {
        levels: [1, 2, 3, 4, 5, 6]
      }
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary-600 dark:text-primary-400 underline cursor-pointer',
        target: '_blank',
        rel: 'noopener noreferrer'
      },
      validate: (url) => {
        // Block dangerous protocols
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
        try {
          const parsed = new URL(url);
          return !dangerousProtocols.includes(parsed.protocol);
        } catch {
          return false;
        }
      }
    }),
    Image.configure({
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded'
      },
      allowBase64: true
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse table-auto w-full my-4'
      }
    }),
    TableRow,
    TableCell.configure({
      HTMLAttributes: {
        class: 'p-2 border border-gray-300 dark:border-gray-700'
      }
    }),
    TableHeader.configure({
      HTMLAttributes: {
        class: 'bg-gray-100 dark:bg-gray-800 font-semibold p-2 border border-gray-300 dark:border-gray-700'
      }
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: 'list-none pl-0'
      }
    }),
    TaskItem.configure({
      HTMLAttributes: {
        class: 'flex items-start gap-2'
      },
      nested: true
    }),
    CodeBlockLowlight.configure({
      lowlight,
      HTMLAttributes: {
        class: 'bg-gray-100 dark:bg-gray-800 rounded p-4 my-4 overflow-x-auto'
      }
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify']
    }),
    Placeholder.configure({
      placeholder,
      showOnlyWhenEditable: true,
      showOnlyCurrent: false
    })
  ];
}

/**
 * Keyboard shortcuts for editor
 */
export const editorShortcuts = {
  'Mod-b': 'toggleBold',
  'Mod-i': 'toggleItalic',
  'Mod-u': 'toggleUnderline',
  'Mod-Shift-s': 'toggleStrike',
  'Mod-Shift-c': 'toggleCode',
  'Mod-k': 'setLink',
  'Mod-Shift-7': 'toggleOrderedList',
  'Mod-Shift-8': 'toggleBulletList',
  'Mod-Shift-9': 'toggleBlockquote',
  'Mod-Alt-1': 'toggleHeading1',
  'Mod-Alt-2': 'toggleHeading2',
  'Mod-Alt-3': 'toggleHeading3',
  'Mod-z': 'undo',
  'Mod-Shift-z': 'redo',
  'Mod-y': 'redo'
};

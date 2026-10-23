import StarterKit from '@tiptap/starter-kit';
import Blockquote from '@tiptap/extension-blockquote';
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
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Node, Extension, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageView } from '@/components/editor/ResizableImageView';
import { QuoteNodeView } from '@/components/editor/QuoteNodeView';
import { VoiceMemoView } from '@/components/editor/VoiceMemoView';
import { Plugin, NodeSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { common, createLowlight } from 'lowlight';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { WhiteboardPreviewExtension } from './whiteboard-preview-extension';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

/**
 * Image node — free corner-drag resizing with a quick-size pill (S/M/L),
 * alignment, lightbox and a hover menu (align / alt / copy / download /
 * delete). Built as a React node view per the image-modification guide.
 */
const ResizableImage = Image.extend({
  // The app embeds images as data URLs (file picker, Drive sync), so pasted
  // HTML with base64 images must parse too — the TipTap default drops them.
  addOptions() {
    return {
      ...this.parent?.(),
      allowBase64: true
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 100,
        parseHTML: (element) => parseFloat(element.getAttribute('data-width') || '100'),
        renderHTML: (attributes) => ({
          'data-width': attributes.width,
          style: `width: ${attributes.width}%`
        })
      },
      align: {
        default: 'center',
        parseHTML: (element) =>
          element.getAttribute('data-align') ||
          (element.getAttribute('data-float') === 'left' ? 'left' : element.getAttribute('data-float') === 'right' ? 'right' : 'center') ||
          'center',
        renderHTML: (attributes) => ({ 'data-align': attributes.align })
      },
      float: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-float') !== 'false',
        renderHTML: (attributes) => ({ 'data-float': String(attributes.float !== false) })
      }
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  }
});

/**
 * Quote block — same node as TipTap's blockquote plus a background tint
 * attribute and a hover ·· menu (copy / cut / background color / delete).
 * A trailing empty paragraph is always kept after a quote so clicking below
 * exits it, and typed wrapping quotation marks are stripped live (the block
 * already says "quote").
 */
const QuoteWithTools = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      bgColor: {
        default: null as string | null,
        parseHTML: (element) => element.getAttribute('data-bg'),
        renderHTML: (attributes) => (attributes.bgColor ? { 'data-bg': attributes.bgColor } : {})
      }
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(QuoteNodeView);
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const tr = newState.tr;
          let modified = false;

          // 1) Strip quotation marks typed at the edges of quote blocks
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'blockquote') return true;
            const texts: Array<{ pos: number; text: string }> = [];
            node.descendants((child, childPos) => {
              if (child.isText && child.text) texts.push({ pos: pos + childPos, text: child.text });
              return false;
            });
            if (!texts.length) return false;
            const quoteChar = /["“”]/;
            const first = texts[0]!;
            const last = texts[texts.length - 1]!;
            let shift = 0;
            const alone = texts.length === 1 && first.text.length === 1;
            if (quoteChar.test(first.text.slice(0, 1))) {
              tr.delete(first.pos, first.pos + 1);
              modified = true;
              shift = -1;
            }
            if (!alone && quoteChar.test(last.text.slice(-1))) {
              const end = last.pos + last.text.length + shift;
              tr.delete(end - 1, end);
              modified = true;
            }
            return false;
          });

          // 2) Always keep an empty paragraph after a trailing quote block
          if (newState.doc.lastChild?.type.name === 'blockquote') {
            tr.insert(newState.doc.content.size, newState.schema.nodes.paragraph!.create());
            modified = true;
          }

          return modified ? tr : null;
        }
      })
    ];
  }
});

/** Clicking an image selects it so the resize bar appears. */
const ResizableImageWithSelection = ResizableImage.extend({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClick: (view, pos, event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'IMG') {
              const $pos = view.state.doc.resolve(pos);
              const clicked = $pos.nodeAfter;
              if (clicked && clicked.type.name === 'image') {
                const transaction = view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos));
                view.dispatch(transaction);
                return true;
              }
            }
            return false;
          }
        }
      })
    ];
  }
});

/**
 * Voice memo node — the recorded audio is embedded in the note content itself
 * as a base64 data URL, so it travels with the note file (and Drive sync).
 * A live speech-recognition transcript (when available) travels with it.
 */
/**
 * Voice memo node — recorded audio embedded as a base64 data URL so it
 * travels with the note (and Drive sync). Optional real-waveform `peaks`
 * (48 ints 0-100); the React view computes them lazily for old memos.
 */
const VoiceMemo = Node.create({
  name: 'voiceMemo',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      dataUrl: { default: null },
      duration: { default: 0 },
      createdAt: { default: null },
      transcript: { default: null },
      peaks: { default: null }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-voice-memo]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-voice-memo': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VoiceMemoView);
  }
});

/** Inline TeX formula rendered with KaTeX; double-click to edit the source. */
const InlineMath = Node.create({
  name: 'inlineMath',
  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return { tex: { default: '' } };
  },

  parseHTML() {
    return [{ tag: 'span[data-tex]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    let rendered = (node.attrs.tex as string) || '';
    try {
      rendered = katex.renderToString((node.attrs.tex as string) || '', { throwOnError: false, output: 'html' });
    } catch { /* keep raw text */ }
    return ['span', mergeAttributes({ 'data-tex': node.attrs.tex }, HTMLAttributes), rendered];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const span = document.createElement('span');
      span.className = 'inline-math';
      const render = (tex: string) => {
        try {
          span.innerHTML = katex.renderToString(tex, { throwOnError: false, output: 'html' });
        } catch {
          span.textContent = tex;
        }
      };
      render(node.attrs.tex as string);
      span.addEventListener('dblclick', () => {
        const next = prompt('TeX formula', node.attrs.tex as string);
        if (next !== null && typeof getPos === 'function') {
          editor.view.dispatch(editor.view.state.tr.setNodeMarkup(getPos(), undefined, { ...node.attrs, tex: next }));
        }
      });
      return {
        dom: span,
        update: (updated) => {
          if (updated.type.name !== 'inlineMath') return false;
          node = updated;
          render(updated.attrs.tex as string);
          return true;
        }
      };
    };
  }
});

/** Embedded YouTube video (URL normalized to /embed/ on insert). */
const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return { src: { default: null } };
  },

  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }];
  },

  renderHTML({ node }) {
    return ['div', { 'data-video-embed': node.attrs.src ?? '' }];
  },

  addNodeView() {
    return ({ node }) => {
      const wrap = document.createElement('div');
      wrap.className = 'video-embed';
      const iframe = document.createElement('iframe');
      iframe.src = node.attrs.src as string;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      wrap.appendChild(iframe);
      return {
        dom: wrap,
        update: (updated) => {
          if (updated.type.name !== 'videoEmbed') return false;
          iframe.src = updated.attrs.src as string;
          return true;
        }
      };
    };
  }
});

/**
 * Get all Tiptap extensions for the editor
 */
export function getEditorExtensions(placeholder = 'Start writing...') {
  return [
    StarterKit.configure({
      codeBlock: false, // We'll use CodeBlockLowlight instead
      blockquote: false, // QuoteWithTools below adds a ·· menu + background color
      heading: {
        levels: [1, 2, 3, 4, 5, 6]
      }
    }),
    QuoteWithTools,
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
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
    ResizableImageWithSelection,
    VoiceMemo,
    InlineMath,
    VideoEmbed,
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse table-auto w-full my-4'
      }
    }),
    TableRow,
    TableCell.configure({
      HTMLAttributes: {
        class: 'p-2 border border-[var(--line)]'
      }
    }),
    TableHeader.configure({
      HTMLAttributes: {
        class: 'bg-[var(--panel-soft)] font-semibold p-2 border border-[var(--line)]'
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
        class: 'bg-[var(--panel-soft)] rounded p-4 my-4 overflow-x-auto'
      }
    }),
    // Copy button on code blocks — appears on hover, top-right (Claude-style)
    Extension.create({
      name: 'codeBlockCopyButton',
      addProseMirrorPlugins() {
        let editorView: EditorView | null = null;
        return [
          new Plugin({
            view: (view) => { editorView = view; return { destroy: () => { editorView = null; } }; },
            props: {
              decorations: (state) => {
                const decorations: Array<Decoration> = [];
                state.doc.descendants((node: PMNode, pos: number) => {
                  if (node.type.name === 'codeBlock') {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'code-copy-btn';
                    button.title = 'Copy code';
                    button.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/></svg><span>Copy</span>';
                    button.addEventListener('mousedown', (event) => event.preventDefault());
                    button.addEventListener('click', (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const current = editorView?.state.doc.nodeAt(pos);
                      void navigator.clipboard.writeText(current?.textContent ?? '').then(() => {
                        button.classList.add('is-copied');
                        const label = button.querySelector('span');
                        if (label) label.textContent = 'Copied';
                        window.setTimeout(() => {
                          button.classList.remove('is-copied');
                          if (label) label.textContent = 'Copy';
                        }, 1400);
                      });
                    });
                    decorations.push(Decoration.widget(pos + 1, button, { side: 100, ignoreSelection: true, key: `code-copy-${pos}` }));
                  }
                  return true;
                });
                return DecorationSet.create(state.doc, decorations);
              }
            }
          })
        ];
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
    }),
    WhiteboardPreviewExtension
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

// Minimal icons for the image selection bar (inline SVG strings)

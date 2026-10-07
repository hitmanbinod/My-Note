import { markdownToHtml } from '@/lib/backup/import-service';

/**
 * Paste pipeline for content copied from AI chat apps (ChatGPT, Claude,
 * DeepSeek, GLM, Qwen, Gemini…) and general Markdown sources.
 *
 * Two clipboard shapes reach us:
 *  1. The app's "copy" button puts raw Markdown on the clipboard as plain
 *     text — converted to real formatted content here.
 *  2. Selecting rich text copies app-specific HTML — wrappers, "Copy code"
 *     buttons and inline styles are cleaned, and `pre > code` structure is
 *     normalized so code blocks (with their language) and tables survive.
 */

/** Heuristic: does this plain text look like Markdown worth converting? */
export function looksLikeMarkdown(text: string): boolean {
  if (/```/.test(text)) return true; // fenced code is unmistakable
  let score = 0;
  if (/^#{1,6}\s+\S/m.test(text)) score += 2;
  if (/^\s*\|.*\|\s*$/m.test(text) && /^\s*\|?[\s:|-]*-[\s:|-]*\|?[\s:|-]*$/m.test(text)) score += 3;
  if (/\*\*[^*\n]+\*\*/.test(text)) score += 1;
  if (/^\s*[-*+]\s+\S/m.test(text)) score += 1;
  if (/^\s*\d+[.)]\s+\S/m.test(text)) score += 1;
  if (/^>\s+\S/m.test(text)) score += 1;
  if (/^\s*\|.*\|\s*$/m.test(text)) score += 1;
  if (/`[^`]+`/.test(text)) score += 1;
  return score >= 3;
}

/** Does this HTML carry real rich structure (vs. an empty/plain wrapper)? */
function htmlHasRichStructure(html: string): boolean {
  return /<(pre|table|h[1-6]|ul|ol|blockquote|img|a\s)\b/i.test(html);
}

/**
 * Clean rich HTML copied from AI chat apps before handing it to the editor:
 * drops UI chrome, normalizes `pre > code` (the apps wrap code in extra divs
 * that break code-block parsing), and strips table cell styling so the
 * notebook's own table styles apply.
 */
export function cleanAiPasteHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // UI chrome that sometimes rides along in selections
  doc.querySelectorAll('script, style, button, input, select, textarea, noscript, svg').forEach((el) => el.remove());
  doc.querySelectorAll('[class*="copy" i], [aria-label*="copy" i], [data-testid*="copy" i]').forEach((el) => el.remove());

  // Normalize code blocks: <pre> must directly contain <code>
  doc.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code) {
      const wrapper = document.createElement('code');
      wrapper.innerHTML = pre.innerHTML;
      pre.innerHTML = '';
      pre.appendChild(wrapper);
    } else if (code.parentElement !== pre) {
      const language = /(?:language-|lang-)([\w+-]+)/.exec(code.className)?.[1];
      pre.innerHTML = '';
      if (language) pre.dataset.language = language;
      pre.appendChild(code);
    }
    if (pre.querySelector('code')) {
      const codeEl = pre.querySelector('code')!;
      const lang = /(?:language-|lang-)([\w+-]+)/.exec(codeEl.className)?.[1] ?? pre.dataset.language;
      codeEl.className = lang ? `language-${lang}` : '';
    }
  });

  // Tables: drop app-specific widths/styles/colors, keep the structure
  doc.querySelectorAll('table, table td, table th, table tr, table col').forEach((el) => {
    el.removeAttribute('style');
    el.removeAttribute('width');
    el.removeAttribute('height');
    el.removeAttribute('bgcolor');
  });

  return doc.body.innerHTML;
}

export interface PasteDecision {
  /** HTML to insert (already converted/cleaned), or null to let the editor's default paste run. */
  html: string | null;
}

/** Decide how to handle an incoming paste. Pure — no DOM writes. */
export function resolvePaste(text: string, html: string): PasteDecision {
  const inPlain = text.trim().length > 0;

  // 1) Copy-button Markdown: plain text that reads as Markdown wins when the
  //    clipboard's HTML has no real structure of its own.
  if (inPlain && looksLikeMarkdown(text) && !(html && htmlHasRichStructure(html))) {
    return { html: markdownToHtml(text) };
  }

  // 2) Rich HTML from an AI app: clean it up before the editor parses it.
  if (html) {
    const cleaned = cleanAiPasteHtml(html);
    if (cleaned.trim()) return { html: cleaned };
  }

  return { html: null };
}

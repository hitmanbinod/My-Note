import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Toggle from '@/components/ui/Toggle';
import { sanitizeFilename } from '@/lib/utils/text';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Live HTML of the note body (from the editor). */
  getHtml: () => string;
  /** Live plain text of the note body. */
  getText: () => string;
  createdAt?: number;
  updatedAt?: number;
}

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildHtmlDocument(title: string, bodyHtml: string, orientation: 'portrait' | 'landscape'): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page { size: A4 ${orientation}; margin: 18mm 16mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1e1d1a; line-height: 1.7; max-width: 760px; margin: 0 auto; padding: 32px 8px; }
  h1, h2, h3 { line-height: 1.25; }
  img { max-width: 100%; height: auto; }
  pre { background: #f4f3ef; padding: 12px; border-radius: 6px; overflow-x: auto; }
  code { background: #f4f3ef; padding: 1px 5px; border-radius: 4px; }
  blockquote { border-left: 3px solid #bbb; margin-left: 0; padding-left: 14px; color: #555; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 6px 9px; text-align: left; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: flex-start; }
</style>
</head>
<body>
<h1>${esc(title)}</h1>
${bodyHtml}
</body>
</html>`;
}

/** UpNote-style export sheet: Text, HTML, PDF (print) and Markdown — all functional. */
export function ExportModal({ open, onClose, title, getHtml, getText, createdAt, updatedAt }: ExportModalProps) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeMeta, setIncludeMeta] = useState(false);
  const [done, setDone] = useState('');

  const baseName = sanitizeFilename(title || 'note') || 'note';
  const flash = (message: string) => {
    setDone(message);
    window.setTimeout(() => setDone(''), 2200);
  };

  const exportText = () => {
    const text = getText();
    download(`${baseName}.txt`, `${title}\n\n${text}`, 'text/plain');
    flash('Text file saved ✓');
  };

  const exportHtml = () => {
    download(`${baseName}.html`, buildHtmlDocument(title, getHtml(), 'portrait'), 'text/html');
    flash('HTML file saved ✓');
  };

  const exportPdf = () => {
    // Hidden-iframe print: works in both the browser and the Electron shell
    // (window.open is blocked there), and the print dialog offers "Save as PDF".
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.srcdoc = buildHtmlDocument(title, getHtml(), orientation);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        flash('Could not open the print dialog');
      }
      window.setTimeout(() => iframe.remove(), 60_000);
    };
    document.body.appendChild(iframe);
    flash('Print dialog opened — choose “Save as PDF”');
  };

  const exportMarkdown = () => {
    void (async () => {
      const { default: TurndownService } = await import('turndown');
      const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
      turndown.keep?.(['ul']);
      let markdown = `# ${title}\n\n${turndown.turndown(getHtml())}`;
      if (includeMeta) {
        const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleString() : '—');
        markdown = `---\ntitle: ${title}\ncreated: ${fmt(createdAt)}\nupdated: ${fmt(updatedAt)}\n---\n\n${markdown}`;
      }
      download(`${baseName}.md`, markdown, 'text/markdown');
      flash('Markdown file saved ✓');
    })();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Export" size="sm">
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={exportText}
          className="pressable flex w-full items-center justify-between rounded-lg border border-[var(--line)] px-4 py-3.5 text-left hover:border-[var(--muted)]/40"
        >
          <span className="text-sm font-semibold text-[var(--ink)]">Export to Text</span>
          <span className="text-[13px] font-semibold text-[var(--brand)]">Export</span>
        </button>

        <button
          type="button"
          onClick={exportHtml}
          className="pressable flex w-full items-center justify-between rounded-lg border border-[var(--line)] px-4 py-3.5 text-left hover:border-[var(--muted)]/40"
        >
          <span className="text-sm font-semibold text-[var(--ink)]">Export to HTML</span>
          <span className="text-[13px] font-semibold text-[var(--brand)]">Export</span>
        </button>

        <div className="rounded-lg border border-[var(--line)] px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--ink)]">Export to PDF</span>
            <span className="text-[13px] text-[var(--muted)]">via print</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="text-[13px] text-[var(--muted)]">Orientation</span>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
              className="h-8 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 text-[13px] outline-none focus:border-[var(--brand)]"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <button
            type="button"
            onClick={exportPdf}
            className="pressable mt-2.5 w-full rounded-md bg-primary-600 py-1.5 text-[13px] font-semibold text-[var(--on-brand)] hover:bg-primary-700"
          >
            Export PDF
          </button>
        </div>

        <div className="rounded-lg border border-[var(--line)] px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--ink)]">Export to Markdown</span>
            <span className="text-[13px] text-[var(--muted)]">.md</span>
          </div>
          <label className="mt-2.5 flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--muted)]">
            <span className="mt-0.5 flex-none">
              <Toggle checked={includeMeta} onChange={setIncludeMeta} aria-label="Include metadata" />
            </span>
            <span>Include additional data such as creation date and updated date</span>
          </label>
          <button
            type="button"
            onClick={exportMarkdown}
            className="pressable mt-2.5 w-full rounded-md bg-primary-600 py-1.5 text-[13px] font-semibold text-[var(--on-brand)] hover:bg-primary-700"
          >
            Export Markdown
          </button>
        </div>

        {done && <p className="pt-1 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">{done}</p>}
      </div>
    </Modal>
  );
}

import { describe, expect, it } from 'vitest';
import { cleanAiPasteHtml, looksLikeMarkdown, resolvePaste } from './paste';
import { markdownToHtml } from '@/lib/backup/import-service';

describe('looksLikeMarkdown', () => {
  it('recognizes fenced code instantly', () => {
    expect(looksLikeMarkdown('Here you go:\n```js\nconst a = 1;\n```')).toBe(true);
  });

  it('recognizes a markdown table', () => {
    expect(looksLikeMarkdown('| a | b |\n|---|---|\n| 1 | 2 |')).toBe(true);
  });

  it('recognizes headings with bold text', () => {
    expect(looksLikeMarkdown('## Summary\nThis is **important** text.')).toBe(true);
  });

  it('rejects ordinary prose', () => {
    expect(looksLikeMarkdown('Just a normal sentence about things. Another one here.')).toBe(false);
  });
});

describe('markdownToHtml tables', () => {
  it('converts a pipe table into table markup', () => {
    const html = markdownToHtml('| Name | Value |\n|---|---|\n| alpha | 1 |\n| beta | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<td>alpha</td>');
    expect(html).toContain('<td>2</td>');
  });
});

describe('cleanAiPasteHtml', () => {
  it('unwraps divs inside pre so code blocks parse with their language', () => {
    const dirty = '<pre><div class="bg-black"><code class="language-python">print(1)</code></div></pre>';
    const cleaned = cleanAiPasteHtml(dirty);
    expect(cleaned).toContain('<pre');
    expect(cleaned).toContain('<code class="language-python">print(1)</code>');
    expect(cleaned).not.toContain('bg-black');
  });

  it('drops copy buttons and script/style chrome', () => {
    const dirty = '<div><style>.x{}</style><button>Copy code</button><pre><code>keep me</code></pre></div>';
    const cleaned = cleanAiPasteHtml(dirty);
    expect(cleaned).toContain('keep me');
    expect(cleaned).not.toContain('<button');
    expect(cleaned).not.toContain('<style');
  });

  it('strips table cell styling so notebook styles apply', () => {
    const dirty = '<table style="width: 999px"><tr><td style="color:red; width:40px">cell</td></tr></table>';
    const cleaned = cleanAiPasteHtml(dirty);
    expect(cleaned).toContain('<td>cell</td>');
    expect(cleaned).not.toContain('style=');
  });
});

describe('resolvePaste', () => {
  it('converts clipboard markdown when the HTML side has no structure', () => {
    const decision = resolvePaste(
      '```js\nconst a = 1;\n```',
      '<div class="chat"><span>const a = 1;</span></div>'
    );
    expect(decision.html).toContain('<pre><code');
  });

  it('cleans rich HTML when the source pastes real markup', () => {
    const decision = resolvePaste(
      'some text',
      '<h1>Heading</h1><table><tr><td style="width:9px">a</td></tr></table>'
    );
    expect(decision.html).toContain('<h1>');
    expect(decision.html).not.toContain('style=');
  });

  it('returns null for plain text without markdown signals', () => {
    expect(resolvePaste('just words', '')).toEqual({ html: null });
  });
});

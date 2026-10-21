/**
 * HTML Reports — host half.
 *
 * Registers the `present_html_report` tool. The tool body itself does almost
 * nothing: the document is carried in the tool *arguments*, which are already
 * part of the conversation log, so the Web client can render it later from the
 * transcript alone. The result is a tiny receipt that keeps the model's context
 * small.
 */

export const inject = ['tools', 'systemPrompt'];

const TOOL_NAME = 'present_html_report';
const MAX_HTML_CHARS = 200000;
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 1200;
const DEFAULT_HEIGHT = 560;
const MAX_TITLE_CHARS = 200;

export function apply(ctx) {
  ctx.tools.register({
    name: TOOL_NAME,
    description:
      'Present a self-contained HTML document to the user as a rich report card inside the conversation. ' +
      'Use it for reports, analyses, comparisons, and explanations that benefit from sections, tables, or charts: ' +
      'pass one complete HTML document (all CSS inline, charts as inline SVG or CSS, no external URLs, fonts, ' +
      'images, or scripts) instead of writing the report out as Markdown. ' +
      'The card renders the document in a sandboxed frame, can be expanded full screen, stays in the session ' +
      'report list, and exports as HTML, PNG, or PDF.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: {
          type: 'string',
          description: `Short report title shown on the card header, up to ${MAX_TITLE_CHARS} characters.`,
        },
        html: {
          type: 'string',
          description:
            'A complete HTML document. Put every style in a single inline <style> element and draw charts with ' +
            'inline SVG or CSS only; external resources never load inside the frame and script execution depends ' +
            'on the host policy. Aim for a responsive layout that also works in a 360px-wide column. ' +
            `Up to ${MAX_HTML_CHARS} characters.`,
        },
        height: {
          type: 'integer',
          description: `Preferred preview height in CSS pixels, ${MIN_HEIGHT}-${MAX_HEIGHT}. Defaults to ${DEFAULT_HEIGHT}; the expanded view ignores it.`,
          default: DEFAULT_HEIGHT,
        },
      },
      required: ['title', 'html'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'The report title as shown on the card.' },
          bytes: { type: 'integer', description: 'UTF-8 byte length of the HTML document.' },
        },
        required: ['title', 'bytes'],
      },
      render(_args, value) {
        const kb = Math.max(1, Math.round(value.bytes / 1024));
        return [{ type: 'text', text: `Presented the HTML report "${value.title}" (${kb} KB).` }];
      },
    },
    isConcurrencySafe: () => true,
    async execute(args) {
      const input = isPlainObject(args) ? args : {};
      const title = trimmedTitle(input.title);
      const html = input.html;
      if (typeof html !== 'string' || html.trim() === '') {
        throw new Error('html must be a non-empty string containing a complete HTML document.');
      }
      if (html.length > MAX_HTML_CHARS) {
        throw new Error(
          `html is ${html.length} characters, over the ${MAX_HTML_CHARS} character limit. ` +
            'Trim the document or split it into several reports.',
        );
      }
      clampHeight(input.height);
      return { title, bytes: Buffer.byteLength(html, 'utf8') };
    },
  });

  ctx.systemPrompt.section({
    name: 'html-reports',
    order: 2950,
    text:
      '## Reports as HTML documents\n\n' +
      "When the answer to a task is a report, analysis, comparison, or explanation whose value lies in its structure " +
      '— sections, tables, metrics, trends, or charts — present it as an HTML document with `present_html_report` ' +
      'instead of writing it out as Markdown, then keep the chat message to one or two lines summarising the finding. ' +
      'Short answers, code, and step-by-step instructions stay in Markdown.',
  });
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimmedTitle(value) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (title === '') throw new Error('title must be a non-empty string.');
  if (title.length > MAX_TITLE_CHARS) {
    throw new Error(`title is ${title.length} characters, over the ${MAX_TITLE_CHARS} character limit.`);
  }
  return title;
}

function clampHeight(value) {
  if (value === undefined || value === null) return DEFAULT_HEIGHT;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`height must be a number between ${MIN_HEIGHT} and ${MAX_HEIGHT}.`);
  }
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value)));
}
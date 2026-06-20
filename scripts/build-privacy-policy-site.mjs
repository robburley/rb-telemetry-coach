import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourcePath = path.resolve("docs/privacy-policy.md");
const outputDir = path.resolve("privacy-site");
const outputPath = path.join(outputDir, "index.html");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const renderInline = (value) => escapeHtml(value).replaceAll("`", "");

const renderMarkdown = (markdown) => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listItems = [];
  let paragraph = [];

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    html.push("<ul>");
    for (const item of listItems) {
      html.push(`  <li>${renderInline(item)}</li>`);
    }
    html.push("</ul>");
    listItems = [];
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      html.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const bullet = /^\*\s+(.+)$/.exec(trimmed);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return html.join("\n");
};

const markdown = await readFile(sourcePath, "utf8");
const body = renderMarkdown(markdown);

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Privacy Policy for RB Telemetry Coach</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #171717;
        background: #f7f7f4;
      }

      body {
        margin: 0;
      }

      main {
        box-sizing: border-box;
        width: min(100%, 760px);
        margin: 0 auto;
        padding: 48px 20px 64px;
        line-height: 1.62;
      }

      h1,
      h2 {
        line-height: 1.2;
      }

      h1 {
        margin: 0 0 24px;
        font-size: 2.2rem;
      }

      h2 {
        margin: 36px 0 12px;
        font-size: 1.25rem;
      }

      p,
      ul {
        margin: 0 0 16px;
      }

      ul {
        padding-left: 24px;
      }
    </style>
  </head>
  <body>
    <main>
${body
  .split("\n")
  .map((line) => `      ${line}`)
  .join("\n")}
    </main>
  </body>
</html>
`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, page, "utf8");
console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);

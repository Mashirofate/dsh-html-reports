# dsh-html-reports

Render rich HTML reports inside DeepSeek Harness: a present_html_report tool, in-chat report cards, a per-session report list, and HTML / PNG / PDF export.

The model calls one tool, `present_html_report`, with a complete HTML document. Instead of
printing Markdown, the conversation shows the document in a sandboxed frame: rich layout,
tables, inline SVG/CSS charts, your own typography.

## Requirements

- DeepSeek Harness `>=0.2.1-rc.2 <0.3.0` (declared as `engines.dsh`).
- A Web profile: the card and the report list are Client UI. The tool itself also works in
  headless profiles, minus the visuals.

## Install

### From GitHub

```sh
dsh plugin --profile web add "git+https://github.com/Mashirofate/dsh-html-reports.git#<commit>"
```

Use the commit pinned in [market/index.json](market/index.json) — a branch name also works
but is not reproducible. npm users can install `dsh-html-reports` once it is published there.

### From the plugin market

Enable the experimental plugin market bundle, then add this index in
Settings → Plugins → Discover:

```
https://raw.githubusercontent.com/Mashirofate/dsh-html-reports/main/market/index.json
```

Restart the profile (or reload the Web page) after installing.

## What you get

| Piece | Where it appears |
|---|---|
| `present_html_report` tool | Model-facing tool, `{title, html, height?}` |
| Report card | In the conversation, where the tool call is |
| Fullscreen overlay | Card's expand button; Escape closes |
| Report list | Right sidebar tab, scoped to the current session |
| Header button | Conversation header, opens the report list |
| Export menu | HTML (raw download), PNG (2x raster), PDF (A4-width slices) |

The tool also adds a short system-prompt section so reports and analyses prefer HTML over
long Markdown.

## Limits

- HTML is capped at 200,000 characters; titles at 200; card height 240-1200 px.
- The frame is `sandbox="allow-scripts"` with an opaque origin: scripts may run (inline
  charts), but the document cannot read the Harness page, its cookies, or your files.
- No external resources: inline every style, script, and image. The Harness CSP and the
  opaque origin both block or break remote loads.
- Report HTML lives in the session log (it is tool-call arguments), so it replays with the
  session. The sidebar list itself is in-memory per page: it refills as report cards mount.
- PNG/PDF export rasterizes: the PDF has no selectable text.

## License

MIT.

# Simple Writer 2.1

A lightweight, browser-based word processor with a structured JSON document model. Intended for quick writing, printing, file conversion and document accessibility review without an account or a backend.

## Launch

Open `index.html` from this folder in a modern desktop browser (Chrome or Edge recommended), or visit the GitHub Pages app when enabled:

https://bluehattom.github.io/Apps/simple-writer/

The **entire folder** is required for local use: `index.html`, `styles.css`, `model.js`, `formats.js`, `app.js`, and `favicon.svg`. There is no build step.

## Features

- Rich text: headings (1–3), paragraphs, quotes, bold/italic/underline/strikethrough, colors, fonts, lists, alignment and links
- **Structured document model v2** (`model.js`): document metadata, page settings and typed paragraphs, headings, lists, tables, images and page breaks; editor reads/writes the model
- DOCX **export and basic import**, including semantic headings, lists, tables, most inline formatting and image descriptions (see compatibility notes)
- File formats: **DOCX, HTML, RTF, TXT, Markdown (MD), structured JSON** via Save As; import DOCX, HTML, TXT, MD, and JSON
- Save As with filename/type chooser, preview and native system file picker where supported; Ctrl+S opens it
- Word count, character count, reading-time and approximate page count
- Find/Replace with match navigation; Ctrl+F opens it
- Insert images from PNG/JPEG/GIF/WebP files, or paste/drop from the clipboard; edit descriptions, decorative status, display width, left/center/right alignment and captions; remove an image
- Appearance selector: Light, Dark, 1980s Green Monochrome, and 1980s Orange Monochrome; your choice is remembered in the browser; printing remains on white paper
- Insert tables with headers/captions; add/delete rows and columns; change column width
- Page size (US Letter/A4), orientation, margins, paragraph spacing and explicit page breaks
- Document outline, format inspector and focus mode
- Accessibility review for headings, links, images, tables and estimated contrast, with jump-to-element and TXT report export
- Local autosave and up to 8 local snapshots (subject to browser storage capacity)
- Business letter, memorandum and report starter templates
- Vector SVG favicon; printing with browser Print (including Save as PDF)

## Document formats and fidelity

**HTML** and **JSON** are the highest-fidelity formats for reopening a Simple Writer document. An exported HTML file contains the structured model in an inert JSON script. HTML content is regenerated from safe supported elements when importing external HTML.

**DOCX** files are real Office Open XML Word documents created using [docx](https://www.npmjs.com/package/docx). The Word import converter uses [Mammoth](https://www.npmjs.com/package/mammoth) for semantic conversion of `.docx` into HTML and then the structured model. Word is a richer format than this editor: advanced layouts, footnotes, embedded charts, comments, tracking, some table styles and floating objects will not round-trip exactly. Mammoth deliberately prioritizes semantic content rather than pixel-perfect fidelity. Inspect imported and exported documents before sharing.

**RTF** export preserves a subset of rich text, lists and table structure; image content is represented by alt-text placeholders rather than embedded pictures. **Markdown** preserves core structure and basic inline emphasis. **TXT** removes formatting. The old binary `.doc` format is not supported.

DOCX import/export loads pinned libraries on demand from `cdn.jsdelivr.net` and therefore requires internet access (or the libraries already cached). All other app features and file types work offline.

## Privacy and accessibility

The app has no server and does not upload document contents. Image insertion converts local images to inline data URIs (animated GIFs become still images). Retro screen themes do not change the saved document, document styling, or print colors. DOCX converters are downloaded from a third-party CDN, but the conversion is done locally in the browser. Autosave and history live only in the current browser's local storage: always export an HTML/JSON/DOCX file for long-term keeping.

The accessibility checker is advisory and does not certify WCAG compliance. Manual review remains essential for reading order, good descriptions, meaning and visual contrast over complex backgrounds.

## Keyboard shortcuts

- Ctrl/Cmd+S: Save As
- Ctrl/Cmd+F: Find and Replace
- Ctrl/Cmd+P: Browser Print
- Ctrl/Cmd+B / I / U: Basic text formatting in the editor
- Escape: Exit focus mode (when active)

## Technical notes

The `window.WriterModel` module defines the canonical schema and HTML/DOM conversion. The contenteditable page is only the editing view, and input changes immediately regenerate the in-memory structured model without rerendering on each keystroke (which helps preserve browser caret and undo). All import/export and snapshots operate on the normalized model.

Libraries used on demand: `docx@9.16.0` (MIT) and `mammoth@1.13.0` (BSD 2-Clause).

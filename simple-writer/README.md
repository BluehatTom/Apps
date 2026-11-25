# Simple Writer

A lightweight, standalone word processor that works in a modern web browser.

## Run

Open [Simple Writer](./index.html) locally, or visit the GitHub Pages deployment (if Pages is enabled):

https://bluehattom.github.io/Apps/simple-writer/

## Features

- Bold, italic, underline, strikethrough, font size, text and highlight color
- Headings, lists, text alignment, hyperlinks, undo/redo
- Print and save to PDF using the browser print dialog
- Save As dialog (Ctrl+S) with filename, format choice, filename preview and cancel
- Save editable HTML or plain text; HTML keeps formatting while TXT does not
- Native system save picker in supporting secure browsers; otherwise browser downloads
- Open HTML or text files
- Browser-local autosave, document name and word count
- Accessibility checker with a navigable results panel, heading hierarchy, link descriptions, image alternative text, table headers/captions and estimated text contrast

## Save and print notes

**Save** opens a Save As dialog every time. In browsers supporting the File System Access API in secure contexts, the system's Save dialog allows selecting a folder and confirming overwrite. Other browsers download the chosen filename to the configured download location. Enable **Ask where to save each file** in browser settings if you want to choose the folder every time.

For PDF, click **Print** and choose your browser's **Save as PDF** destination.

## Accessibility notes

The accessibility check is an automated aid, not a guarantee of WCAG conformance. Review the document manually for clear writing, reading order, accurate alternative text, meaningful headers, and appropriate use of color. Color contrast is estimated and may not account for transparent overlays, gradients, or backgrounds behind images.

## Privacy

No build tools, backend, account, or external libraries are required. Local autosave is specific to the browser and origin. For a durable copy, save the document as HTML.

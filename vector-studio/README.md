# Vector Studio

A lightweight browser-based SVG editor with a procedural fractal engine.

## Run

Open `index.html` in a modern desktop browser. Keep `index.html`, `style.css`, and `app.js` together. No installation or build is required.

For GitHub Pages, open the `/vector-studio/` path on the repository's existing Pages site. This folder does not change the repository's homepage or Pages configuration.

## Features

- Rectangle, ellipse, star, line, pencil, polygon pen, and text tools
- Smooth paths and editable path points
- Move, resize, rotate, duplicate, group, align, and reorder objects
- Layers with visibility and locking
- Branching trees, Koch snowflakes, Sierpinski triangles, dragon curves, and phyllotaxis blooms
- Live fractal previews with adjustable detail, color, and applicable geometry controls
- SVG import; SVG and PNG export; transparent backgrounds
- Browser autosave and portable JSON project files
- Undo/redo, grid snapping, zoom, and pan

## Quick start

Click **?** in the lower-left corner for the guide and shortcuts. Choose **New blank** under Design to clear the example. In Fractals, adjust a pattern and click **Add to artboard**.

Use **Save project** to download an editable backup. Use **Open** to restore a project or import SVG artwork. **Export** downloads SVG or PNG artwork.

## Data and limits

Artwork is processed locally in your browser. Autosave belongs to the current browser and origin; save a project file to move work between computers or websites. Optional Google Fonts fall back to installed fonts when unavailable.

Imported SVGs are sanitized and edited as whole objects. Fractals are added as whole vector objects and can be resized, rotated, or recolored. This editor does not support Illustrator AI files, advanced boolean operations, or full professional prepress workflows.

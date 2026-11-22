# Simple CAD Studio

A lightweight, dependency-free CAD web app for making dimensioned 2D drawings and exporting simple extruded 3D solids.

## Run

Open `index.html` in Chrome, Edge, or Firefox. No installation, account, backend, or network connection is required. For GitHub Pages, upload `index.html` to a repository and turn on Pages. Use **Open** to import the included `sample-design.cad.json` example.

## Features

- Click-and-drag rectangles, rounded rectangles, circles, ellipses, triangles, hexagons, lines, text and point-to-point measurements.
- Automatic object labels and width/height dimension annotations (click a blue dimension value to edit it in place); editable exact X/Y, width, height, rotation, label, outline, color, and extrusion depth.
- Inch/mm controls (internally measured in millimeters), grid snapping, zoom/pan, selection handles, object list, show/hide, duplicate, front, undo/redo.
- Local browser autosave; JSON project download and import.
- True-size SVG and DXF with an outlines-only cutting option; high-resolution PNG; browser Print / Save as PDF; and binary STL extrusion for closed shapes. Includes a simple interactive 3D preview.

## Export notes

- **SVG:** millimeter page sizing and true-scale editable vector objects. Select **Outlines only** in Export to exclude labels and dimensions from cutting. Laser cutter settings should be checked before cutting.
- **DXF:** geometry and basic text entities, plus dimension marks (unless Outlines only is enabled). DXF geometry is stored in millimeters and Y-axis inverted into the normal CAD coordinate convention. Styling/color may differ across CAD packages.
- **STL:** shapes become individual closed triangle meshes with per-shape extrusion depths in millimeters. STL format does not embed units. Text, dimensions and open lines do not appear in STL. Shapes are not boolean-unioned or subtracted, and overlapping extrusions can require cleanup in a slicer/modeler.
- **PNG:** high-resolution white-background screenshot-sized rendering, suitable for sharing rather than dimensioned manufacturing.
- **PDF:** Print / Save as PDF opens a clean vector drawing in the browser's print window. To preserve scale, check print scaling settings.
- **Project JSON:** stores all objects and settings for later editing. Local autosave is browser-specific and can be erased by clearing browser data; keep JSON backups.

## Shortcuts

V: Select; R: Rectangle; C: Circle; L: Line; T: Text; D: Measure; Del: Delete; Ctrl+Z: Undo; Ctrl+Y: Redo; Ctrl+S: Save project. Mouse wheel: Zoom; Space + drag or middle-button drag: Pan.

## Limitations

This is a quick-design utility, not a constraint-based CAD kernel. STL extrusion supports positive, simple convex shapes, not holes, boolean subtraction/union, fillets in 3D, or embossed lettering. Validate mechanical part tolerances and preview STL in your slicer before printing.
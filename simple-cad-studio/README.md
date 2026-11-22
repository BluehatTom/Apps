# Simple CAD Studio — v1.3

A lightweight, dependency-free browser CAD tool for dimensioned 2D layouts, basic extruded 3D solids, and modelled metric screw holes. Runs locally in Chrome, Edge or Firefox from **index.html**, with no backend, credentials, internet connection or installation.

## Getting started

1. Open `index.html` in a browser (or use the GitHub Pages link).
2. Choose **Rectangle**, **Circle** or another shape and drag to draw it. Select the object and set precise width, height, and extrusion in the Properties panel.
3. Check **3D solid** to include the selected shape in STL output; uncheck it for a 2D-only shape. Closed shapes default to 3D solids.
4. Choose **Screw hole** (O) or click **Place screw hole on canvas** in a solid’s Properties. Hover over the shape to see the placement crosshair; **click the exact center of your hole**, then select the metric size, hole type and depth. Turn off **Snap** for sub-grid placement. Move existing holes by **dragging their purple ring/crosshair** or use the hole’s **Move** button to click a new position.
5. Click **3D preview** to inspect, then **Export → STL** for 3D printing, or save a local editable `.cad.json` project with **Save to computer**.

You can open the included `sample-design.cad.json` or `sample-threaded-plate.cad.json` with the app's **Open** button.

## Version 1.3 additions — precise hole placement and correctly oriented 3D view

- **Click-to-place screw holes:** Choose **Screw hole** (O), hover on any visible 3D solid, then click the desired center. A green crosshair shows a valid location; red means too close to an edge or another hole. Hole settings open *after* you choose the location. Labels and empty-looking areas of shapes no longer prevent geometric hit testing.
- **Drag an existing hole:** In **Select** mode, grab the purple ring/crosshair and drag to reposition. The hole will snap to the grid if snapping is enabled. Click the purple target without dragging to edit its size, pitch mode or depth.
- **Move via Properties:** Each hole has **Move**, **Edit**, and **Remove** controls. **Move** returns you to the canvas to click a new center in the same solid. Escape cancels placement. If a move would overlap another hole or cross the edge, the app refuses it rather than committing invalid geometry.
- **Holes travel with their solid:** Moving a shape by dragging or entering X/Y in Properties, and duplicating a solid, now preserves the hole positions relative to its parent shape. Rotating a shape preserves the hole arrangement.
- **Upright 3D preview:** Camera projection now correctly views the extruded **+Z top face** from above, with walls extending downward on screen. You can still drag to orbit or scroll to zoom.
- **Export separation:** Interactive placement rings and guides are editor-only and never appear in SVG or STL exports. STL uses the newly positioned holes.

## Version 1.2 additions

- **Grab and pan:** Dedicated **Hand / Pan** tool (H), grab empty workspace while Select is active, Space + drag, or middle-button drag. Mouse wheel zooms around the pointer. Fit/zoom buttons remain available.
- **3D solid toggle:** Each closed 2D object can be included or excluded from STL and 3D preview. Extrusion depth is set per solid; SVG and DXF still retain the 2D outlines.
- **Screw holes:** M2, M2.5, M3, M4, M5, M6, M8, and M10 coarse metric presets. Choose the center on the canvas, or edit the precise X/Y coordinates in the dialog. Enter blind-hole/thread depth or choose **Through entire solid**, plus radial print allowance in millimeters.
- **Hole options:** **Modeled internal thread** (a true 3D helical cavity cut into the solid), **Tap-drill** (plain smooth hole sized for tapping after printing), or **Clearance** (smooth larger hole for screw passage).
- **Multiple holes per solid:** Add, edit, or delete holes through the Properties panel. Hole positions follow the parent shape when the shape moves or rotates; project JSON saves all hole specifications.
- **Exports:** STL now creates continuous solid boundaries with blind and through cylindrical/helically threaded holes. DXF and SVG include hole-opening circles; dimension lines and auto-labels can still be excluded with **Outlines only**.
- **3D preview:** Shows the same aperture and solid geometry used to build the STL export.

## Metric presets

| Screw | Coarse pitch | Tap-drill diameter | Typical clearance diameter |
| --- | ---: | ---: | ---: |
| M2 | 0.40 mm | 1.6 mm | 2.4 mm |
| M2.5 | 0.45 mm | 2.05 mm | 2.9 mm |
| M3 | 0.50 mm | 2.5 mm | 3.4 mm |
| M4 | 0.70 mm | 3.3 mm | 4.5 mm |
| M5 | 0.80 mm | 4.2 mm | 5.5 mm |
| M6 | 1.00 mm | 5.0 mm | 6.6 mm |
| M8 | 1.25 mm | 6.8 mm | 9.0 mm |
| M10 | 1.50 mm | 8.5 mm | 11.0 mm |

Modeled threads use a helical, 60°-profile-inspired **approximation**, based on the ISO metric coarse nominal diameter and pitch, with selectable print allowance. The contour is **not** a certified ISO thread profile or exact tolerance class. Print test coupons and check screw fit, insertion, strength, orientation and material before a functional or load-bearing assembly. For precise metal tapping, use the **Tap-drill** option and physically tap the printed part. In printed plastic, a threaded insert may be more robust than modeled polymer threads.

## Other existing features

- Rectangles, rounded rectangles, circles, ellipses, triangles, hexagons, lines, text, and point-to-point measurements.
- Auto labels and editable size annotations; exact X/Y and dimensions; rotation, fill and outline colors, grid snapping, layering, duplicate, undo/redo, show/hide.
- Millimeters and inches for drawing controls (geometry stored internally and STL written in mm).
- Save to computer / Open editable JSON projects and local browser autosave.
- Export accurate-scale **SVG**, **DXF**, binary **STL**, **PNG**, or use browser print / Save as PDF. Cutting-only SVG/DXF outlines omit labels and dimension marks.

## Shortcuts

V Select · H Hand / pan · O Screw hole · R Rectangle · C Circle · L Line · T Text · D Measure · Delete remove · Ctrl+Z undo · Ctrl+Y redo · Ctrl+S save project · Wheel zoom · Space + drag pan · Middle-button drag pan.

## Important limitations

This is **not** a full parametric CAD or industrial solid-modeling kernel. It supports holes cut into individual convex solid shapes (including curved silhouettes). Holes must not overlap or cross outside their parent shape. Separate overlapping solids are not boolean-unioned, embossing of text is not supported, and large threaded models can have high STL triangle counts. Check STLs in your slicer and validate print tolerances. The no-dependencies threaded surface uses a tessellated helical approximation, not ISO certified cutting-tool geometry.

## Testing

The v1.2 STL outputs were checked using independent mesh validation. The v1.3 regression suite additionally checked pointer-based placement, visual placement guides, dragging holes, inspector-based moving, invalid-position rejection, saving/reopening, shape movement/duplication, editor-handle exclusion from SVG, and the upright 3D preview. Through and blind helical holes, multiple holes in one solid, and rotated rectangles, rounded rectangles, circles, hexagons, ellipses and triangles exported as watertight, consistently wound positive-volume models in tested cases. Existing JSON, PNG, SVG, DXF and STL export regression tests also passed.
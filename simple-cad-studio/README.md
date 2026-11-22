# Simple CAD Studio — v1.2

A lightweight, dependency-free browser CAD tool for dimensioned 2D layouts, basic extruded 3D solids, and modelled metric screw holes. Runs locally in Chrome, Edge or Firefox from **index.html**, with no backend, credentials, internet connection or installation.

## Getting started

1. Open `index.html` in a browser (or use the GitHub Pages link).
2. Choose **Rectangle**, **Circle** or another shape and drag to draw it. Select the object and set precise width, height, and extrusion in the Properties panel.
3. Check **3D solid** to include the selected shape in STL output; uncheck it for a 2D-only shape. Closed shapes default to 3D solids.
4. Choose **Screw hole** (O), then click *inside* a solid, or select a shape and use **Add screw hole** in Properties. Select the metric size, whether to model an internal thread, the hole depth and coordinates.
5. Click **3D preview** to inspect, then **Export → STL** for 3D printing, or save a local editable `.cad.json` project with **Save to computer**.

You can open the included `sample-design.cad.json` or `sample-threaded-plate.cad.json` with the app's **Open** button.

## Version 1.2 additions

- **Grab and pan:** Dedicated **Hand / Pan** tool (H), grab empty workspace while Select is active, Space + drag, or middle-button drag. Mouse wheel zooms around the pointer. Fit/zoom buttons remain available.
- **3D solid toggle:** Each closed 2D object can be included or excluded from STL and 3D preview. Extrusion depth is set per solid; SVG and DXF still retain the 2D outlines.
- **Screw holes:** M2, M2.5, M3, M4, M5, M6, M8, and M10 coarse metric presets. Enter the blind hole/thread depth or check **Through entire solid**, plus exact hole center X/Y and a radial print allowance in millimeters.
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

The v1.2 STL outputs were checked using independent mesh validation. Through and blind helical holes, multiple holes in one solid, and rotated rectangles, rounded rectangles, circles, hexagons, ellipses and triangles exported as watertight, consistently wound positive-volume models in tested cases. Existing JSON, PNG, SVG, DXF and STL export regression tests also passed.
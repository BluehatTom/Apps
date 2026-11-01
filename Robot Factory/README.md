# Robot Factory

A browser-based robot design workbench. Start with a robot's purpose, customize its requirements, export printable STL parts, plan electronics, and generate hardware-specific starter code.

## Features

- Six robot families: articulated arms, wheeled robots, tracked robots, legged robots, Cartesian gantries, and pan/tilt mounts.
- Arm reach, payload, joint count, gripper opening, assembly masses, and static torque estimates.
- Thirteen parametric printable component templates with interactive previews and STL exports.
- Purpose-specific bills of materials, wiring guidance, and Arduino Uno / ESP32 / Raspberry Pi Pico code templates.
- Browser-local project storage and JSON import/export.

## Run

Serve `dist/` with any static HTTP server. There are no build dependencies.

For example, with Python installed:

```sh
python -m http.server 5173 --directory dist
```

Open `http://localhost:5173`. Google Fonts are optional; the interface includes system font fallbacks.

## Validate

With Node.js installed:

```sh
node check.cjs
```

The checks cover closed, consistently oriented meshes, all robot-family/controller combinations, project state round trips, and arm sizing behavior. They do not substitute for hardware testing or firmware compilation.

## Scope

Generated parts are starting geometries, not validated robot assemblies. Confirm mechanical fit, print strength, actuator ratings, power requirements, and stability. Torque estimates describe static loading under stated assumptions, not certified payload capacity.

Mobile platforms receive serial motor-control starters; arms and pan/tilt mounts receive individual servo-control starters. Legged and gantry robots currently receive configuration scaffolds without gait or coordinated motion control.

## Files

- `dist/index.html`: application shell
- `dist/style.css`: responsive interface styles
- `dist/app.js`: project persistence, previews, STL export, and mobile firmware
- `dist/purpose.js`: robot classifications, requirements, part presets, and purpose-specific hardware/code
- `check.cjs`: dependency-free validation checks

Deploy the contents of `dist/` to any static host. Hosting-specific credentials and deployment artifacts are not included.

<div align="center">

# Glyph

**Turn any static sketch, diagram, or photo into a live, playable 2D rigid-body physics simulation directly in your browser.**

[![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Matter.js](https://img.shields.io/badge/Matter.js-2D_Physics-22D3EE?style=for-the-badge)](https://brm.io/matter-js/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

*Built for the **Silicon Valley Buildathon 2026** — bringing pen-and-paper intuition to life at 60fps.*

</div>

---

## Overview

Every day, students, mechanical engineers, and game designers sketch physical systems on paper—ramps, seesaws, plinko boards, and 2D platformer levels—only for those drawings to remain frozen in static ink. Testing a rough mechanical idea normally requires opening heavy CAD tools or configuring rigid-body colliders inside a game engine.

**Glyph** eliminates that setup friction. Upload a photo of any hand-drawn diagram (or load a built-in workbench preset), and Glyph converts the visual geometry into active static collision boundaries overlaid with a real-time **Matter.js** physics engine. Drop dynamic bodies onto your lines, tweak environmental constants on the fly, and watch your sketch react immediately.

---

## Core Capabilities

- **Zero-Latency Image-to-Physics Overlay**
  - Upload custom PNG/JPG/WebP sketches or switch between built-in interactive presets (*Ramp + Seesaw*, *Plinko Pegs*, *Platformer Level*).
  - Client-side processing ensures instantaneous feedback without round-trip server delays.
- **60fps Rigid-Body Simulation Engine**
  - Powered by **Matter.js**, supporting continuous collision detection, angular momentum, rotational inertia, and multi-body stacking.
  - Spawn single or multiple dynamic objects on demand while the simulation runs live.
- **Real-Time Environmental Workbench**
  - **Gravity Control ($g$):** Dynamically scale downward acceleration from $0\text{ m/s}^2$ (zero-G) up to $20\text{ m/s}^2$, including quick-toggle presets for **Moon** ($1.62\text{ m/s}^2$), **Earth** ($9.81\text{ m/s}^2$), and **Jupiter** ($24.79\text{ m/s}^2$).
  - **Restitution ($e$):** Adjust surface elasticity from $0.0$ (inelastic clay-like impact) to $1.0$ (super-elastic bounce).
  - **Surface Friction ($\mu$):** Control kinetic and static friction coefficients to test sliding vs. rolling mechanics.
- **Wireframe Debug & Telemetry HUD**
  - Toggle seamlessly between **Image View** (raw sketch artwork) and **Wireframe Collision View** (exposed rigid-body hitboxes, vertices, and contact boundaries).
  - Live telemetry readout displaying frame rate (FPS), active body count, simulation state, and an iterative contour-extraction console log.

---

## System Architecture

Glyph uses a dual-layer HTML5 Canvas pipeline synchronized with a deterministic `requestAnimationFrame` physics loop:

```text
+-------------------------------------------------------------------+
|                        GLYPH WORKBENCH UI                         |
|  [Play/Pause]  [Reset]  [Drop Ball]  [Gravity / Friction Sliders] |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                   DUAL-LAYER CANVAS VIEWPORT                      |
|                                                                   |
|  Layer 2 (Top):    Matter.js Rigid-Body Renderer & Wireframe HUD  |
|                    - Dynamic bodies, velocity & collision boxes   |
|  ---------------------------------------------------------------  |
|  Layer 1 (Bottom): Source Artwork / Sketch Image / SVG Preset     |
|                    - Base visual reference locked 1:1 to world    |
+-------------------------------------------------------------------+
                                  ^
                                  |
+-------------------------------------------------------------------+
|                 STROKE & CONTOUR PARSER PIPELINE                  |
|  Pixel Luminance Thresholding -> Segment Alignment -> Colliders   |
+-------------------------------------------------------------------+

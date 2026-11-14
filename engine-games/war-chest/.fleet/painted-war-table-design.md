---
name: Painted War Table
description: A miniature battlefield and a quartermaster's equipment chest.
colors:
  ink: "#152323"
  panel: "#203030"
  ivory: "#f1e7cf"
  muted: "#b9c2b3"
  brass: "#d9b978"
  friendly: "#7cbeb7"
  danger: "#ed9278"
---

# Design System: War Chest

## Overview
**Creative North Star: "The Painted War Table"**
Owner delegated selection after three complete concepts. A warm, crafted tabletop sits inside a quiet campaign interface. Miniatures stand on stone tiles; cloth banners, pine trees, water and ruined masonry belong to the battlefield. Tactical annotations must remain legible over the scene.

## Colors
Deep green-black panels recede; ivory is readable text, brass signals the player's next important action. Teal identifies allies and movement; terracotta identifies threats. Text and shapes accompany color.

## Typography
Georgia for campaign titles, Avenir Next for readable controls, with system fallbacks. Provisional display 30–40 px; controls/body 16–20 px at 1440×900. No tiny decorative text as the only gameplay explanation.

## Layout
The entire window is the game world, per the owner's refinement. A compact HUD overlays the battlefield: mission and round above, portrait/order tray below, a small contextual field-orders panel at the edge. Do not return to a framed viewport beside a dashboard sidebar. Enemy intents live on the board and in target inspection; the latest resolved events remain above the order tray. Camp has full-screen campaign, chest and forge views. Native minimum 1152×720 render pixels is enforced. Smaller mobile widths are unsupported; the generic Fleet web viewport gate is not evidence of native desktop quality.

## Elevation & Depth
Real 3D depth, orthographic camera, warm key light, soft shadows and muted distance. Interfaces use solid surfaces, thin brass edges and restrained corners rather than glass. A short movement tween helps track a command, never delays the next decision.

## Shapes
Square battlefield tiles, circular miniature bases, shaped inventory footprints. Compact rectangular controls with visible keyboard focus and hover states.

## Components
Godot Control, Button, PanelContainer and container layouts supply native engine behavior. Gear buttons include footprint, owner, effect and upgrade. Threats display exact next-turn target cells. Disabled actions explain restrictions. The battle log describes resolved changes.

## Do's and Don'ts
- Do expose range, cost and damage before actions.
- Do show packing synergy as a rule, not only decoration.
- Do retain whitespace around the battle scene and readable labels.
- Don't represent generated concept art as working gameplay.
- Don't introduce mobile layout or web UI libraries into a desktop engine project.
- Don't promise concept-render fidelity or long-term balance before evidence exists.

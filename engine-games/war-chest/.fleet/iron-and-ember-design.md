---
name: Iron & Ember
description: A painted fortress war, commanded through equipment and formations.
colors:
  ink: "#101923"
  slate: "#263544"
  ivory: "#f0e5cc"
  muted: "#b5c2ce"
  brass: "#d7b575"
  friendly: "#90c9ed"
  danger: "#e9867c"
  crimson: "#762e37"
---
# Design System: War Chest

Status: superseded visual treatment. Owner requested cartoonish and simpler after seeing this build. Preserve as historical implementation context; do not treat the realistic painted-art direction below as approved. Replacement selection pending.

## Overview
**Creative North Star: "Iron & Ember"**
Owner selected B on 2026-09-22, replacing the rejected green tabletop and tile-movement loop. Painterly full-screen 2D fortress warfare: storm-blue mountains, slate masonry, crimson banners, amber fire. A dark world with bright, readable decisions.

## Colors
Storm-blue and grey carry the world. Ivory carries text, pale blue identifies friendly actions, crimson/coral identify enemy pressure, brass identifies command resources and rewards. Words and shapes accompany color.

## Typography
Georgia titles and card names; Avenir Next rules and numbers. At the 1440x900 logical canvas, 16–20 px body and 28–44 px display.

## Layout
The whole window is the game. Three battlefield fronts fill the middle; objective/round above, command hand below. Keep, war chest and recruitment are separate full-screen views. No dashboard sidebar. Minimum desktop 1152x720, proportional canvas scaling. Mobile is unsupported.

## Elevation & Depth
Painted background, separate alpha character sprites and interactive controls. Dark scrims under text, masonry and metal command frames. Short attack and hit feedback; reduced motion supported. Never use a generated battle screenshot as a functioning scene.

## Shapes
Rectangular command cards with narrow brass frames, circular command costs and selection markers, three long front lines, shaped equipment cells.

## Components
Native Godot buttons handle keyboard focus, hover, disabled and selected states. Cards expose actor, cost and effect; select a card then its target. Threat labels show the hero or gate receiving the next strike. Reward view states earned gold and newly playable unlocks.

## Do's and Don'ts
- Make packed equipment visibly affect commands.
- Keep state legible without color alone.
- Preserve progress after defeat; surface save failures.
- Do not reinstate the green tabletop, framed viewport or tile walking.
- Do not claim visual fidelity or fun from rules tests.
- Do not use web/mobile checks as native game evidence.

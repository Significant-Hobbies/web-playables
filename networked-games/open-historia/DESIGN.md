# Open Historia design system

## Existing visual language

Dark cartographic campaign UI with slate surfaces, amber actions and story progress, emerald save success, rose exit/error and teal advisor. Preserve existing map rendering and blueprint theme.

## Tokens and type

Source: src/styles/globals.css. Background #0B0F19; foreground #e2e8f0; accent #d97706; surface #151B2B; raised surface #1E2538. Existing Inter and JetBrains Mono stacks; campaign controls use mono. Keep established compact bordered panels and small corner radii.

## Campaign layout

Wide screens retain map overlays. Below 1100px, use a scrollable campaign layout: wrapping toolbar, map, command terminal, story, diplomacy, relations and timeline. Each panel occupies its own space; no capability is removed. The command terminal owns its suggestion list. Advisor and save/settings dialogs remain dismissible overlays bounded by the viewport.

## Interaction

Amber Advance is the primary action. Keep pending orders and save feedback visible. Narrow-screen buttons and form controls use at least 44px touch height, with visible keyboard focus. Preserve existing disclosure behavior and reduced-motion rules.

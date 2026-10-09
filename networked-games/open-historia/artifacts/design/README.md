# Campaign responsive repair — September 8, 2026

Preserve lane, product/operate surface. Scope: campaign layout and access to existing controls. The owner-held historical experiment is still unqualified as a complete product.

Before: diplomacy covers the toolbar; advisor covers Advance at 390px. After: below 1100px, the wrapping toolbar, map, terminal, story, diplomacy, relations, advisor and timeline occupy separate space. DOM order follows visual order. Touch controls have 44px targets, inputs use 16px text, focus remains visible and the advisor has a text label. Desktop diplomacy starts below the toolbar. Terminal suggestions stay inside the terminal, and log scrolling no longer moves the campaign page.

Review: status visibility 4, real-world match 3, user control 4, consistency 3, error prevention 3, recognition 3, efficiency 3, composition 3, recovery 4, help 3 = 33/40 for the control adaptation. Audit: accessibility 3, performance 3, responsive 4, theming 3, anti-patterns 3 = 16/20. These are manual scoped assessments, not measurements or whole-product grades. No new layout P0/P1 remains in the checked scenarios. Remaining product blockers include coarse/generic historical geography and factions, full rewind memory and authenticated cloud saves. Physical-device behavior remains unqualified.

The source detector reported no findings in GameClient.tsx. Existing game colors, monospace controls and panels are intentionally preserved. No live detector overlay was presented. Browser screenshots and automated interactions were used for review.

The WebKit harness initially blocked same-origin blob workers, making its map blank. The filter now permits only the local origin, including its blob workers; external requests remain blocked. A separate invalid ocean-label zoom expression was corrected, and browser tests reject layer/WebGL/TypeError diagnostics. Map aria-busy stays true until the renderer becomes idle; screenshots wait for it rather than guessing from control visibility.

Automated browser coverage: 390, 768 and 1440 widths in Chromium and WebKit; no panel overlap at narrow widths, reachable queue/advance/save controls, simulated turn narrative, empty and populated timeline hide/show, failed-provider retry and save/reload, and quota failure retaining the campaign. Provider responses in these tests are synthetic. This does not replace live provider acceptance or real Safari/iPhone testing.

Final local checks: typecheck, lint and 79 unit tests passed. The combined browser run passed 9/10; tablet hover scaling failed the new bounds assertion. The narrow-layout advisor scale was fixed and the exact 768px case then passed. CI reruns all ten browser cases at the committed source.

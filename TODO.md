# DUALFORCE implementation outcomes

Baseline: audited integrated fork commit `8e36eb0d2d33acb52642d657bb2aa4cfea258526`, pinned by local preservation tag `audit-baseline/8e36eb0`; accepted published baseline is `eb0fad3eddaaba24fc70a9c8245574aee8a323e1` on `feat/restore-complete-engine-controls`, which supplies GitHub Pages. The user has requested publication after the current contrast, model/settings-slide and prior gear-free lab changes pass testing. The older `feat/minimal-engine-showcase` and upstream `main` remain untouched.

## Preserve the complete original website
- [ ] Preserve all original pages, information, text, product specifications, images, navigation, sections, functional interactions, and existing controls; do not remove or simplify existing content.
- [ ] Keep the original `models.html`, `3d-engine.html`, and `engine.html` pages complete and functional; keep the full 10-slide homepage deck, its nested `#deck` navigation, existing local assets and scripts, and the original legacy engine experience. Add the specifically requested standalone-lab controls without removing its existing behaviors; the requested crankshaft gear meshes/callout are the only model parts to remove.
- [ ] Preserve existing claims and page-specific content without silently reconciling inconsistent model names or financial assumptions. Repair the known missing `dualforce-deck1.html` destination without removing its source navigation link.

## Restore every audited Manus engine control in the appended viewer
- [ ] Expose and wire Hero, Front, Side, and Detail camera presets; camera reset; orbit/drag; wheel and pinch zoom; and Auto-orbit, while preserving the current zoom interaction when controls or scroll state change.
- [ ] Expose and wire the 400–7,200 RPM reference slider (100-RPM increments), Play/Pause, and the 10% slow-motion inspection mode; retain the current visual cadence model and do not label it physical real-time RPM.
- [ ] Expose the continuous 0–1 explode slider, Assembled/Exploded end-state controls, and Reset Assembly; preserve the existing assembled-kinematics hold behavior during meaningful exploded inspection.
- [ ] Expose the continuous 0–1 casing-opening slider and explicit closed/open end states; expose separate Solid/Transparent casing options; expose the Boolean longitudinal section toggle; preserve the existing door, clipping and model logic.
- [ ] Expose an engineering-annotation on/off control; Overview, Detailed, and Exploded annotation modes; all projected labels; clickable component selection and the selected-component description/readout.
- [ ] Expose all eight existing component visibility controls—casing, frame, cylinders, pistons, rods, crank, stator, and magnets—and keep the visible count and selection state accurate.
- [ ] Retain the existing electromagnetic/coil-activity visual layer and its current behavior. Do not present it as validated force, coil timing, electrical rating, efficiency or performance; do not add fake/decorative controls or functionality that never existed in the original Manus project.
- [ ] Keep all required controls accessible and labelled on both mobile and desktop; a compact expandable group may organize them, but no required option may be silently hidden at a breakpoint.

## Apply the approved minimal premium automotive theme without reducing content
- [ ] Apply white/off-white, charcoal/black, soft neutral grey, fine strokes/borders, elegant typography, clean spacing and subtle transitions consistently across the navigation, original pages, new model viewer, controls, cards and supporting sections.
- [ ] Remove excessive sporty graphics, aggressive typography, loud racing colors and unnecessary decorative effects through styling; do not remove original information, imagery, sections, controls or functional legacy experiences.
- [ ] Use the supplied visual references as visual guidance while retaining the DUALFORCE identity and keeping engine geometry/physics caveats explicit.

## Correct and synchronize the scroll presentation
- [ ] Provide smooth forward and backward scroll animation, accurate scroll synchronization, no visible lag, sudden jumps or flickering, correct model scaling, and seamless transitions.
- [ ] Keep the viewer connected to the correct scroller: the appended engine sequence uses the window scroll because it remains after the original main deck; preserve the original deck’s nested `#deck` slide navigation.
- [ ] Drive the stage, visible model scale, progress indication and scroll copy from one normalized progress value; keep the scale transition reversible and retain the current small-to-large direction.

## Optimize rendering without removing the original engine
- [ ] Investigate and reduce unnecessary multiple simultaneous canvases, independent active animation loops, offscreen rendering, scroll synchronization work, GPU/CPU use and resource retention/disposal.
- [ ] Preserve every original page, viewer, legacy control, and its functional experience; do not remove the original legacy engine experience merely to reduce rendering overhead.
- [ ] Pause or avoid non-visible rendering work where safe; resume with stable time/animation state and dispose resources only when the corresponding scene is actually torn down.

## Add the supplied reference-style options to the original 3D lab
- [x] Add a motion panel showing RUNNING/PAUSED, a working Play/Pause control, and a simulated-RPM slider spanning 400–7,200 in 100-RPM increments.
- [x] Add an ASSEMBLED/EXPLODED state selector, a continuous assembly-separation slider with assembled/separated range labels, and Reset Assembly; keep the slider and end-state buttons synchronized.
- [x] Add HERO, FRONT, SIDE, and DETAIL camera presets plus Reset Camera & Zoom; retain drag orbit, zoom, and the existing Auto-orbit control.
- [x] Add a visible/hidden toggle for the proposed electromagnetic interaction layer without hiding the actual stator or magnetic-element visibility groups.
- [x] Add a solid/transparent aluminium-casing toggle and an engineering-labels on/off toggle with OVERVIEW, DETAILED, and EXPLODED annotation modes; keep projected labels and component selection/readout operational.
- [x] Add eight working component-visibility controls for Aluminium Casing, Internal Support Frame, Twin Cylinder Pack, 4032 Aluminium Pistons, Forged 4340 Rods, Crank/Flywheel/Bearings, Copper Stator Windings, and Magnetic Elements; update the visible-group count accurately.
- [x] Style the lab model with the supplied dark graphite background, cool satin titanium/silver surfaces and restrained copper accents, and style its control panel with quiet light neutral surfaces, thin rules and legible technical typography.
- [x] Remove the crankshaft gear meshes and gear callout from the original 3D lab as well as the already gear-free appended engine; preserve the crankshaft, crank webs, shaft, flywheel, bearings and existing motion.

## Improve final-slide contrast and separate the engine model from settings
- [x] On the original final investment/unit-economics slide, make all roadmap amounts/details, calculator step labels, row values and totals legible against their actual light/dark surfaces; preserve the original wording, figures, colors of meaning and interactions.
- [x] Give the appended engine sequence and standalone 3D lab a dedicated full-area engine-model slide and a separate system-settings slide so settings no longer consume or cover the model view.
- [x] Provide clear, accessible navigation between MODEL and SYSTEM CONTROLS; keep the selected slide visible, preserve engine/control state, and keep every existing setting functional on the settings slide.
- [x] Keep the model and settings slides usable at desktop and narrow/mobile widths without clipping or horizontal overflow; model view defaults to the unobstructed model slide.
- [x] Once the above and prior gear-free lab changes pass final checks, commit and push to the existing `feat/restore-complete-engine-controls` Pages source branch of `v01Dxwebz/DUALFORCE-`, verify the Pages deployment and live content, and do not change upstream `main` or `feat/minimal-engine-showcase`.

## Responsive operation and final review gate
- [ ] Keep all restored controls usable on mobile and desktop; create a compact layout where needed; support touch rotation, pinch zoom and page scrolling without one gesture unintentionally blocking the other.
- [ ] Before requesting review, individually exercise all four camera presets; all eight visibility controls; continuous explode and casing sliders; slow motion; annotation on/off and all three modes; projected-label selection/readout; auto-orbit; wheel/pinch zoom; and reset controls.
- [ ] Exercise scroll in both directions and verify the original deck’s slide navigation plus the original `models.html`, `3d-engine.html`, and `engine.html` interactions still work.
- [ ] Check desktop and narrow/mobile layouts, WebGL fallback, console errors, resource cleanup, non-visible render-loop behavior, and the visual comparison against the original pages and original Manus viewer; do not mark an outcome complete without evidence of actual behavior.
- [x] Do not publish until this request passes its final tests; then publish only the explicitly authorized feature-branch update and verify the public Pages deployment. Do not merge into upstream or change the Pages source selection.

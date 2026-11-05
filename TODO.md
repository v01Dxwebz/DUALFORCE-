# DUALFORCE implementation outcomes

Baseline: audited integrated fork commit `8e36eb0d2d33acb52642d657bb2aa4cfea258526`, pinned by local preservation tag `audit-baseline/8e36eb0`; implementation runs only on `feat/restore-complete-engine-controls` in `/home/ubuntu/dualforce-site-implementation`. The upstream original and published feature branch remain untouched.

## Preserve the complete original website
- [ ] Preserve all original pages, information, text, product specifications, images, navigation, sections, functional interactions, and existing controls; do not remove or simplify existing content.
- [ ] Keep the original `models.html`, `3d-engine.html`, and `engine.html` pages complete and functional; keep the full 10-slide homepage deck, its nested `#deck` navigation, existing local assets and scripts, and the original legacy engine experience.
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

## Responsive operation and final review gate
- [ ] Keep all restored controls usable on mobile and desktop; create a compact layout where needed; support touch rotation, pinch zoom and page scrolling without one gesture unintentionally blocking the other.
- [ ] Before requesting review, individually exercise all four camera presets; all eight visibility controls; continuous explode and casing sliders; slow motion; annotation on/off and all three modes; projected-label selection/readout; auto-orbit; wheel/pinch zoom; and reset controls.
- [ ] Exercise scroll in both directions and verify the original deck’s slide navigation plus the original `models.html`, `3d-engine.html`, and `engine.html` interactions still work.
- [ ] Check desktop and narrow/mobile layouts, WebGL fallback, console errors, resource cleanup, non-visible render-loop behavior, and the visual comparison against the original pages and original Manus viewer; do not mark an outcome complete without evidence of actual behavior.
- [ ] Keep the implementation on the separate local branch for review. Do not push to the published/production branch, merge into upstream, or publish until implementation testing is complete and the user has reviewed the result.

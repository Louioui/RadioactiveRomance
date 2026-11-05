# Final demo verification

The generated concept and final desktop/mobile screenshots were opened with `view_image` together. The browser implementation was checked in the Codex in-app browser; no Playwright browser fallback was needed. Native concept viewport: 1536×1024. Additional sizes: 1280×720 and 390×844. The mobile document has no horizontal overflow.

## Visual comparison

| Point | Result |
| --- | --- |
| Composition | Same single-screen desktop hierarchy: header, large background title, central character, lower-left audio, lower-right conversion, thin footer. |
| Title | Two ivory uppercase lines with narrow proportions. Fixed horizontal alignment and mobile clipping. |
| Palette | Obsidian, ivory, emerald, periwinkle, and restrained plum retained. |
| Branding | Gothic two-line wordmark and monospace header controls retained. |
| Character | Intentional replacement of generated concept doll with the supplied model. Its shape, eyes, pose, and lighting response differ from the concept. Browser geometry normalization was fixed for quantized attributes. |
| Heart | Real supplied heart region glows via shader; audio also changes point-light intensity. Replaced temporary emissive sphere with localized material emission. |
| Controls | Circular periwinkle play button, live waveform, squared green outlined CTA, and aligned file metadata. |
| Background | Supplied graveyard image replaces the generated surrounding roses. Dark treatment keeps UI legible. |
| Responsive behavior | Phone uses an enlarged character and vertically stacked controls; desktop remains a fixed HUD. |

Above-the-fold copy was checked against the concept: principal headline, brand, player label, product title, CTA, tagline and annotations retained. Intentional additions: current copyright year, Demo indicator, accessible heart progress dots/label, and keyboard orbit slider. Actual playback time replaces static concept time. The band and download dialogs extend the same visual system.

The implementation is faithful to the concept's visual direction, with the supplied character/background and demo content as intentional deviations. It is not a pixel-identical recreation of the generated character artwork. No unresolved layout clipping remains at the checked sizes.

## Functional checks

- Audio play and pause, advancing elapsed time, seek to 32 seconds, and keyboard volume adjustment.
- Active visualizer and changed green/plum lighting during playback.
- 3D raycast heart clicks increment state; a third keyboard activation unlocks the bonus.
- Free demo ZIP downloaded successfully; archive integrity validated separately.
- Secret WebP downloaded successfully via the accessible link.
- Camera slider reaches the back view at 180 degrees; return control restores front view.
- Band lineup, demo download, privacy, and terms dialogs work; Escape dismisses the modal.
- Final TypeScript and production build pass. npm audit reports zero vulnerabilities.

The native browser click mapping became unreliable after a viewport reset during QA, so the affected interactions were verified with documented browser CDP pointer events and keyboard activation. An isolated development hot-reload error occurred during code formatting; the completed source builds and reloads correctly.

Demo limits: synthetic preview audio, free demo ZIP, and an artwork bonus; no live payments or paid-file entitlement backend. The original model is not rigged, so head tracking is vertex deformation. The 3D vendor bundle triggers Vite's generic 500 kB warning (about 291 kB gzipped); the optimized model is 4.49 MB.

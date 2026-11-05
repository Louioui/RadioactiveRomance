# Radioactive Romance — Candlelit Cage

A complete interactive **demo** release site built with React 18, TypeScript, Vite, Three.js, and React Three Fiber. Uses the supplied `Heart_Voodoo-3d.glb` and `background.jpeg` assets. The originals are preserved.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5173. For a production build:

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host. All fonts, audio, textures, and downloads are served locally with the application. No API keys or external services are needed for this demo.

## Try it

- **Listen to the signal** starts a 32-second synthetic soundscape. Play/pause, seeking, mute, and volume work. The visible waveform reads the Web Audio analyser; low-frequency energy drives the heart and green light.
- **Move the pointer** to make the doll's head subtly follow. The supplied model is unrigged; a vertex shader gently deforms the head region instead of inventing skeletal bones.
- **Scroll on desktop** to orbit 180 degrees around the doll. The footer slider also works with keyboard arrow keys and Home/End, and on mobile. Return to the surface resets the camera.
- **Click the exposed heart three times** to trigger green fragments and replace the Origin CTA with a free artwork download. The three-beat hint is an equivalent accessible button.
- **Acquire Origin** opens the demo release dialog. Download a ZIP containing the synthetic preview WAV, supplied artwork, and a descriptive README. There is no payment or email collection.
- **The band** opens the fictional band's story and lineup. Privacy and terms describe actual demo behavior.

## What's real and what's demo

The 3D rendering, Web Audio analysis, controls, orbit, secret interaction, dialogs, and downloads are functional. The player now loads the supplied **Standing Through It All** MP3. The visible MP3/WAV product specification describes the planned paid release; the demo ZIP contains artwork and a README only. No Stripe, Supabase, email delivery, paid entitlement, or live purchase flow is connected.

To substitute release content, copy `.env.example` to `.env.local` and set public preview and bonus URLs. `VITE_CHECKOUT_URL` can link to an existing hosted checkout, but adding that link alone does **not** implement secure paid-file delivery. Never put paid masters or secret credentials in `public/` or `VITE_` variables. Remote audio must allow cross-origin requests for Web Audio analysis.

## Structure

- `src/components/InteractiveDoll.tsx`: model normalization, shader head movement, localized emissive heart, lights, camera orbit, raycasting, and instanced particles.
- `src/audio/useAudioEngine.ts`: one user-initiated Web Audio context and media source, reusable FFT buffers, playback state, and resource cleanup.
- `src/components/AudioPlayer.tsx`: analyser-driven waveform and accessible playback controls.
- `src/components/Overlays.tsx`: band, demo download, privacy, and terms dialogs.
- `src/config/release.ts`: public release configuration.
- `src/styles.css`: responsive visual system and reduced-motion support.
- `design/concept.png`: generated visual direction.
- `design/desktop.jpg` and `design/mobile.jpg`: final browser previews.

The optimized model is 4.49 MB versus the original 93.58 MB. Textures are capped at 2048px and geometry is simplified and Meshopt-compressed. Runtime geometry is expanded into float attributes before normalization so compressed integer attributes don't corrupt the mesh. To regenerate the optimized model with the official glTF Transform CLI:

```sh
npx @gltf-transform/cli optimize Heart_Voodoo-3d.glb public/assets/doll.glb --compress meshopt --texture-compress webp --texture-size 2048 --simplify-ratio 0.15 --simplify-error 0.002
```

The synthetic audio can be regenerated using `python3 scripts/create-preview.py`. Font licenses are in `public/fonts/licenses/`.

## Verification

TypeScript and the production build pass. Browser verification used the Codex in-app browser at 1536×1024, 1280×720, and 390×844. Checked model loading, title bounds, audio progress, waveform and reactive lighting, demo ZIP download, pointer raycast heart clicks, keyboard secret unlock, bonus download, 180-degree orbit and reset, dialog opening/closing, and absence of horizontal overflow on mobile. The production bundle includes the Three.js runtime, so its main 3D chunk is larger than Vite's generic 500 kB warning threshold. Model download and decode remain the largest cold-load costs.

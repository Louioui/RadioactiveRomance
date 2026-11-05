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

- **Listen to the signal** plays the release tracks (**Standing Through It All** and **Bleeding Out Empty**; pick one under *Release tracks*). Play/pause, seeking, mute, and volume work. The giant background title and the browser tab show the selected song. A dedicated, unsmoothed Web Audio analyser detects kick drums (40–150 Hz spectral flux with an adaptive threshold): each kick squeezes the heart, flashes the green glow, and makes the doll nod and sway.
- **Watch the doll.** It breathes, tilts its heavy head, lets its gaze wander, and sways on its own. The supplied model is unrigged, so a vertex shader deforms the chest and head regions instead of inventing skeletal bones. **Move the pointer** and the head follows. All motion and per-kick flashes are turned down under `prefers-reduced-motion`.
- **Click the exposed heart three times** to burst it into flesh chunks and green sparks, leaving an empty chest, and replace the Origin CTA with a free artwork download. The three-beat hint is an equivalent accessible button.
- **Acquire Origin** opens the demo release dialog. Download a ZIP containing the Shattered Canvas artwork and a short README. There is no payment or email collection.
- **The band** opens the band's story and lineup. Privacy and terms describe actual demo behavior.

## What's real and what's demo

The 3D rendering, Web Audio analysis, controls, idle animation, secret interaction, dialogs, and downloads are functional. The player now loads the supplied **Standing Through It All** MP3 and **Bleeding Out Empty** MP3. The release picker switches tracks without rebuilding the audio graph, and both tracks drive the same Web Audio reactive heart. The visible MP3/WAV product specification describes the planned paid release; the demo ZIP contains artwork and a README only. No Stripe, Supabase, email delivery, paid entitlement, or live purchase flow is connected.

To substitute release content, copy `.env.example` to `.env.local` and set public preview and bonus URLs. `VITE_CHECKOUT_URL` can link to an existing hosted checkout, but adding that link alone does **not** implement secure paid-file delivery. Never put paid masters or secret credentials in `public/` or `VITE_` variables. Remote audio must allow cross-origin requests for Web Audio analysis.

## Structure

- `src/components/InteractiveDoll.tsx`: model normalization, cutting the heart out of the doll, kick detection, shader breathing and head movement, lights, raycasting, and instanced particles.
- `src/components/AnatomicalHeart.tsx`: the detached heart's wet-tissue shader, green rim glow, and beat squeeze.
- `src/components/ReleaseTitle.tsx`: the song-driven background title, fitted to two lines.
- `src/audio/useAudioEngine.ts`: one user-initiated Web Audio context and media source, a smoothed analyser for the waveform plus an unsmoothed one for kick detection, playback state, and resource cleanup.
- `src/components/AudioPlayer.tsx`: analyser-driven waveform and accessible playback controls.
- `src/components/Overlays.tsx`: band, demo download, privacy, and terms dialogs.
- `src/config/release.ts`: public release configuration.
- `src/styles.css`: responsive visual system and reduced-motion support.
- `design/concept.png`: generated visual direction.
- `design/desktop.jpg` and `design/mobile.jpg`: final browser previews.

The optimized model is 4.49 MB versus the original 93.58 MB. Textures are capped at 2048px and geometry is simplified and Meshopt-compressed. Runtime geometry is expanded into float attributes before normalization so compressed integer attributes don't corrupt the mesh.

### Regenerating the models

Both generated models come from the full-resolution source model `Heart_Voodoo-3d.glb` (93.6 MB). It is **not committed** to this repository because of its size; get it from the project's original asset files and place it in the repository root before running either command. The generated files in `public/assets/` are committed, so you only need the source to rebuild them.

The doll (official glTF Transform CLI):

```sh
npx @gltf-transform/cli optimize Heart_Voodoo-3d.glb public/assets/doll.glb --compress meshopt --texture-compress webp --texture-size 2048 --simplify-ratio 0.15 --simplify-error 0.002
```

The detached heart (`public/assets/heart.glb`, ~56k triangles with its own repacked texture and normal map). Needs `numpy`, `djpeg` and `ffmpeg`:

```sh
python3 scripts/extract-heart.py
```

`scripts/create-preview.py` generates an optional synthetic sound-design preview (`public/assets/signal-preview.wav`); the site does not play it. Font licenses are in `public/fonts/licenses/`.

## Verification

TypeScript and the production build pass. Browser verification used the Codex in-app browser at 1536×1024, 1280×720, and 390×844. Checked model loading, title bounds, audio progress, waveform and reactive lighting, demo ZIP download, pointer raycast heart clicks, keyboard secret unlock, bonus download, dialog opening/closing, and absence of horizontal overflow on mobile. The production bundle includes the Three.js runtime, so its main 3D chunk is larger than Vite's generic 500 kB warning threshold. Model download and decode remain the largest cold-load costs.

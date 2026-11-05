import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUpRight,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { InteractiveDoll } from "./components/InteractiveDoll";
import { AudioPlayer } from "./components/AudioPlayer";
import { Overlays, type Overlay } from "./components/Overlays";
import { useAudioEngine } from "./audio/useAudioEngine";
import { release } from "./config/release";

export default function App() {
  const engine = useAudioEngine();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [clicks, setClicks] = useState(0);
  const [orbit, setOrbit] = useState(0);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const stage = useRef<HTMLElement>(null);
  const unlocked = clicks >= 3;
  const heartClick = useCallback(
    () => setClicks((n) => Math.min(3, n + 1)),
    [],
  );
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReducedMotion(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (overlay || window.innerWidth < 700 || reducedMotion || event.ctrlKey)
        return;
      event.preventDefault();
      setOrbit((value) =>
        Math.min(1, Math.max(0, value + event.deltaY * 0.0008)),
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [overlay, reducedMotion]);
  useEffect(() => {
    if (unlocked) document.body.style.cursor = "";
  }, [unlocked]);
  return (
    <main
      ref={stage}
      className={`experience ${engine.playing ? "is-playing" : ""} ${unlocked ? "is-unlocked" : ""} ${ready ? "is-ready" : ""}`}
    >
      <div className="backdrop" aria-hidden="true" />
      <div className="haze" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <header className="header">
        <a className="wordmark" href="/" aria-label="Radioactive Romance home">
          Radioactive<span>Romance</span>
        </a>
        <p className="tagline">Synthetic skin. Real pulse.</p>
        <nav aria-label="Main navigation">
          <button onClick={() => setOverlay("band")}>
            The band <ArrowUpRight size={14} />
          </button>
          <button
            className="sound-toggle"
            onClick={() => {
              if (!engine.playing) {
                engine.setMuted(false);
                void engine.toggle();
              } else engine.setMuted(!engine.muted);
            }}
            aria-label={
              !engine.playing
                ? "Enable sound"
                : engine.muted
                  ? "Enable sound"
                  : "Mute sound"
            }
          >
            {engine.playing && !engine.muted ? (
              <Volume2 size={14} />
            ) : (
              <VolumeX size={14} />
            )}
            <span>Sound {engine.playing && !engine.muted ? "on" : "off"}</span>
          </button>
        </nav>
      </header>
      <section
        className="visual-stage"
        aria-label="Candlelit Cage interactive release artwork"
      >
        <h1 className="release-title">
          <span>Candlelit</span>
          <span>Cage</span>
        </h1>
        <div className="side-note left-note">
          <span>01 / Origin</span>
          <i />
        </div>
        <div className="side-note right-note">
          Post-hardcore /<br />
          Raw emotion
        </div>
        <div className="doll-stage">
          <InteractiveDoll
            analysis={engine.analysis}
            playing={engine.playing}
            hoveredStoreTier={hovered ? "origin" : "none"}
            secretUnlocked={unlocked}
            onHeartClick={heartClick}
            orbit={orbit}
            reducedMotion={reducedMotion}
            onReady={onReady}
          />
        </div>
        <div className="heart-hint">
          <button
            onClick={heartClick}
            disabled={unlocked}
            aria-label={
              unlocked
                ? "Secret unlocked"
                : `Touch the heart. ${clicks} of 3 beats discovered`
            }
          >
            <span className="heart-dots" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <i className={i < clicks ? "lit" : ""} key={i} />
              ))}
            </span>
            {unlocked
              ? "THE CANVAS IS SHATTERED."
              : clicks === 1
                ? "A PULSE BENEATH THE SEAMS."
                : clicks === 2
                  ? "ONE MORE. LET IT BREAK."
                  : "THREE BEATS. SOMETHING BREAKS."}
          </button>
        </div>
      </section>
      <div className="bottom-controls">
        <AudioPlayer engine={engine} />
        <section className="conversion" aria-label="Origin digital download">
          <h2>
            {unlocked ? "A fracture in the signal." : "The Origin download"}
          </h2>
          <p>
            {unlocked
              ? "You found what was hiding underneath."
              : "One track. Every exposed nerve."}
          </p>
          {unlocked ? (
            <a
              href={release.secretUrl}
              download={
                release.secretIsArtwork
                  ? "Shattered-Canvas-Wallpaper.webp"
                  : true
              }
              className="primary-button unlocked"
            >
              {release.secretIsArtwork
                ? "Extract secret artwork"
                : "Extract hidden track"}
              <ArrowDownToLine size={18} />
            </a>
          ) : (
            <button
              className="primary-button"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onClick={() => setOverlay("origin")}
            >
              Acquire Origin <ArrowUpRight size={18} />
            </button>
          )}
          <span className="format-line">
            {unlocked
              ? release.secretIsArtwork
                ? "SHATTERED CANVAS / FREE WALLPAPER"
                : "SHATTERED CANVAS / FREE DOWNLOAD"
              : "320KBPS MP3 + LOSSLESS WAV"}
          </span>
        </section>
      </div>
      <footer className="footer">
        <span>© {new Date().getFullYear()} Radioactive Romance</span>
        <div className="orbit-controls">
          {orbit > 0.02 ? (
            <button onClick={() => setOrbit(0)}>
              <RotateCcw size={12} /> Return to the surface
            </button>
          ) : (
            <label htmlFor="orbit">
              Scroll to explore <ArrowDown size={13} />
            </label>
          )}
          <input
            id="orbit"
            aria-label="Explore the doll from front to back"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={orbit}
            onChange={(e) => setOrbit(Number(e.target.value))}
          />
        </div>
        <div>
          <button onClick={() => setOverlay("privacy")}>Privacy</button>
          <button onClick={() => setOverlay("terms")}>Terms</button>
          <span className="demo-label">Demo</span>
        </div>
      </footer>
      <div className="sr-only" role="status" aria-live="polite">
        {unlocked
          ? "Secret unlocked. Download the hidden artwork with the Extract secret artwork link."
          : clicks > 0
            ? `${clicks} of three heart beats discovered.`
            : ""}
      </div>
      <Overlays
        key={overlay}
        active={overlay}
        onClose={() => setOverlay(null)}
      />
    </main>
  );
}

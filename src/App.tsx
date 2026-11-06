import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { InteractiveDoll } from "./components/InteractiveDoll";
import { AudioPlayer } from "./components/AudioPlayer";
import { Overlays, type Overlay } from "./components/Overlays";
import { useAudioEngine } from "./audio/useAudioEngine";
import { ReleaseTitle } from "./components/ReleaseTitle";
import { release } from "./config/release";

const HEART_REBUILD_DELAY_MS = 45_000;
const HEART_REWIND_MS = 3_000;

export default function App() {
  const engine = useAudioEngine();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [clicks, setClicks] = useState(0);
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
    if (unlocked) document.body.style.cursor = "";
  }, [unlocked]);
  // pressing the heart open plays the hidden track
  useEffect(() => {
    if (unlocked) engine.playSecret();
  }, [unlocked, engine.playSecret]);
  // after the heart shatters, wait, then play the burst in reverse and
  // hand the heart back so the ritual can start over
  const [rewinding, setRewinding] = useState(false);
  useEffect(() => {
    if (!unlocked) return;
    let done: number | undefined;
    const wait = window.setTimeout(() => {
      setRewinding(true);
      done = window.setTimeout(
        () => {
          setRewinding(false);
          setClicks(0);
        },
        reducedMotion ? 0 : HEART_REWIND_MS,
      );
    }, HEART_REBUILD_DELAY_MS);
    return () => {
      window.clearTimeout(wait);
      window.clearTimeout(done);
    };
  }, [unlocked, reducedMotion]);
  const songTitle = engine.track?.title ?? release.title;
  useEffect(() => {
    document.title = `${songTitle} — Radioactive Romance`;
  }, [songTitle]);
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
        aria-label={`${engine.track?.title ?? release.title} interactive release artwork`}
      >
        <ReleaseTitle title={engine.track?.title ?? release.title} />
        <div className="doll-stage">
          <InteractiveDoll
            analysis={engine.analysis}
            playing={engine.playing}
            hoveredStoreTier={hovered ? "origin" : "none"}
            secretUnlocked={unlocked}
            rewinding={rewinding}
            rewindSeconds={HEART_REWIND_MS / 1000}
            onHeartClick={heartClick}
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
              : "Standing Through It All · one exposed nerve."}
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
        <span>
          © {new Date().getFullYear()} Radioactive Romance. All rights reserved.
        </span>
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

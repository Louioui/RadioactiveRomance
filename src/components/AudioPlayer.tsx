import { useEffect, useRef } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { AudioEngine } from "../audio/useAudioEngine";
import { release } from "../config/release";
export const formatTime = (value: number) =>
  `${Math.floor(value / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(value % 60)
    .toString()
    .padStart(2, "0")}`;
export function AudioPlayer({ engine }: { engine: AudioEngine }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const draw = () => {
      const { analyser, bins } = engine.analysis.current;
      if (analyser) analyser.getByteFrequencyData(bins);
      ctx.clearRect(0, 0, 560, 70);
      for (let i = 0; i < 56; i++) {
        const idle = 5 + Math.sin(i * 1.7) ** 2 * Math.sin(i * 0.18) ** 2 * 27;
        const height =
          engine.playing && analyser ? Math.max(4, bins[i] * 0.25) : idle;
        ctx.fillStyle =
          i / 56 < engine.time / engine.duration ? "#d1d0ff" : "#9695c8";
        ctx.fillRect(i * 10, 35 - height / 2, 3, height);
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [engine.analysis, engine.playing, engine.time, engine.duration]);
  return (
    <section className="audio-player" aria-label="Audio player">
      <div className="player-top">
        <button
          className="play-button"
          aria-label={engine.playing ? "Pause preview" : "Play preview"}
          onClick={() => void engine.toggle()}
        >
          {engine.playing ? (
            <Pause size={19} fill="currentColor" />
          ) : (
            <Play size={19} fill="currentColor" />
          )}
        </button>
        <div>
          <h2>Listen to the signal</h2>
          <p>
            {release.isPreview ? "Preview soundscape" : release.title}{" "}
            <span>
              · {formatTime(engine.time)} / {formatTime(engine.duration)}
            </span>
          </p>
        </div>
      </div>
      <div className="player-bottom">
        <div className="waveform">
          <canvas ref={canvas} width="560" height="70" aria-hidden="true" />
          <input
            type="range"
            aria-label="Seek audio"
            min="0"
            max={engine.duration}
            step="0.1"
            value={engine.time}
            onChange={(e) => engine.seek(Number(e.target.value))}
          />
        </div>
        <div className="volume">
          <button
            aria-label={engine.muted ? "Unmute audio" : "Mute audio"}
            onClick={() => engine.setMuted(!engine.muted)}
          >
            {engine.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={engine.muted ? 0 : engine.volume}
            onChange={(e) => {
              engine.setVolume(Number(e.target.value));
              engine.setMuted(false);
            }}
          />
        </div>
      </div>
      {engine.error && (
        <p className="audio-error" role="alert">
          {engine.error}
        </p>
      )}
    </section>
  );
}

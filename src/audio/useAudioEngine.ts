import { useCallback, useEffect, useRef, useState } from "react";
import { release } from "../config/release";

export interface AudioAnalysis {
  analyser: AnalyserNode | null;
  bins: Uint8Array<ArrayBuffer>;
  bass: number;
}
export function useAudioEngine() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const context = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const analysis = useRef<AudioAnalysis>({
    analyser: null,
    bins: new Uint8Array(128),
    bass: 0,
  });
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(32);
  const [volume, setVolume] = useState(0.65);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = new Audio(release.audioUrl);
    element.crossOrigin = "anonymous";
    element.preload = "metadata";
    audio.current = element;
    const update = () => setTime(element.currentTime);
    const metadata = () => {
      if (Number.isFinite(element.duration)) setDuration(element.duration);
    };
    const play = () => setPlaying(true);
    const pause = () => setPlaying(false);
    const failed = () => {
      setError("The signal is unavailable. Try again shortly.");
      setPlaying(false);
    };
    element.addEventListener("timeupdate", update);
    element.addEventListener("loadedmetadata", metadata);
    element.addEventListener("play", play);
    element.addEventListener("pause", pause);
    element.addEventListener("ended", pause);
    element.addEventListener("error", failed);
    return () => {
      element.pause();
      element.removeAttribute("src");
      element.load();
      for (const [event, fn] of [
        ["timeupdate", update],
        ["loadedmetadata", metadata],
        ["play", play],
        ["pause", pause],
        ["ended", pause],
        ["error", failed],
      ] as const)
        element.removeEventListener(event, fn);
      if (context.current) void context.current.close();
      context.current = null;
      gain.current = null;
      analysis.current.analyser = null;
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    if (gain.current && context.current)
      gain.current.gain.setTargetAtTime(
        muted ? 0 : volume,
        context.current.currentTime,
        0.03,
      );
  }, [volume, muted]);
  const toggle = useCallback(async () => {
    const element = audio.current;
    if (!element) return;
    try {
      setError("");
      if (!context.current) {
        const ctx = new AudioContext();
        context.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        const level = ctx.createGain();
        level.gain.value = muted ? 0 : volume;
        gain.current = level;
        ctx.createMediaElementSource(element).connect(analyser);
        analyser.connect(level);
        level.connect(ctx.destination);
        analysis.current.analyser = analyser;
      }
      await context.current.resume();
      if (element.paused) {
        if (element.ended) element.currentTime = 0;
        await element.play();
      } else element.pause();
    } catch {
      setError("Audio could not start. Press play to retry.");
    }
  }, [muted, volume]);
  const seek = (value: number) => {
    if (audio.current) {
      audio.current.currentTime = value;
      setTime(value);
    }
  };
  return {
    playing,
    time,
    duration,
    volume,
    muted,
    error,
    analysis,
    toggle,
    seek,
    setVolume,
    setMuted,
  };
}
export type AudioEngine = ReturnType<typeof useAudioEngine>;

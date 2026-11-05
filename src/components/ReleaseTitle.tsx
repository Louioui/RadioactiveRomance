import { useLayoutEffect, useMemo, useRef, useState } from "react";

/** Split a title into at most two lines with the most even character count. */
function splitTitle(title: string): string[] {
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return [title];
  let best = 1;
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    const score = Math.max(a, b);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** Narrowest the condensed lettering may get before the font shrinks instead. */
const MIN_SQUEEZE = 0.55;
/** Share of the stage width each line may span. */
const SPAN = 0.92;

/**
 * The giant background title. It shows whichever song is selected and
 * squeezes each line horizontally (the poster-style condensed look) so both
 * lines span the stage, shrinking the font only for very long names.
 */
export function ReleaseTitle({ title }: { title: string }) {
  const lines = useMemo(() => splitTitle(title), [title]);
  const root = useRef<HTMLHeadingElement>(null);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const [fit, setFit] = useState<{ font: number; squeeze: number[] }>({
    font: 1,
    squeeze: lines.map(() => 1),
  });

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const target = el.clientWidth * SPAN;
      // read each line's natural width at full font size (transforms don't
      // affect offsetWidth), then restore whatever size React applied
      const natural = spans.current.slice(0, lines.length).map((s) => {
        if (!s) return 1;
        const prev = s.style.fontSize;
        s.style.fontSize = "1em";
        const w = s.offsetWidth;
        s.style.fontSize = prev;
        return w;
      });
      const raw = natural.map((w) => target / Math.max(1, w));
      const font = Math.min(1, Math.min(...raw) / MIN_SQUEEZE);
      const squeeze = raw.map((r) => Math.min(1, r / font));
      setFit({ font, squeeze });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [lines]);

  return (
    <h1
      ref={root}
      className="release-title"
      aria-label={title}
      key={title}
    >
      {lines.map((line, i) => (
        <span
          key={line}
          ref={(node) => {
            spans.current[i] = node;
          }}
          className="title-line"
          aria-hidden="true"
          style={{
            fontSize: `${fit.font}em`,
            transform: `translateX(-50%) scaleX(${fit.squeeze[i] ?? 1})`,
            animationDelay: `${i * 0.12}s`,
          }}
        >
          {line}
        </span>
      ))}
    </h1>
  );
}

/**
 * Value — the "A × B = C" worth explainer, with the result counting up in gold.
 *
 * Remotion port of motion-gfx.py --type value ("100,000 pts × 1.5¢ = $1,500"). The
 * staggered entrance (label → A → × → B → = → result pops + counts) is the same beat
 * order as the Python card, but here it's spring/keyframe animation in code — the
 * documented GUI-only "animated reveal" gap, closed at zero token cost. Transparent
 * background so it overlays a face/B-roll on Resolve V2-V5 or composites via ffmpeg.
 *
 * Props:
 *   label  small green eyebrow, e.g. "what the bonus is worth"
 *   a      left factor,  e.g. "100,000 pts"
 *   b      right factor, e.g. "1.5¢ / pt"
 *   c      result,       e.g. "$1,500"   (counts up if numeric; "=" + result hidden if empty)
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./brand";
import { BrandFonts } from "./fonts";
import { formatCountUp } from "./util";

export type ValueProps = {
  label?: string;
  a: string;
  b: string;
  c?: string;
};

export const valueDefaults: ValueProps = {
  label: "what the bonus is worth",
  a: "100,000 pts",
  b: "1.5¢ / pt",
  c: "$1,500",
};

/** Eased entrance 0→1 starting at `atSec`, ~0.4s long (mirrors motion-gfx.py env()). */
const useEnter = (atSec: number, durSec = 0.4) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return interpolate(frame, [atSec * fps, (atSec + durSec) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const Factor: React.FC<{ text: string; at: number; muted?: boolean }> = ({ text, at, muted }) => {
  const e = useEnter(at);
  return (
    <span
      style={{
        fontFamily: FONT.heavy,
        fontSize: muted ? 58 : 78,
        color: muted ? C.textSecondary : C.white,
        opacity: e,
        transform: `translateY(${(1 - e) * 28}px)`,
        display: "inline-block",
      }}
    >
      {text}
    </span>
  );
};

export const Value: React.FC<ValueProps> = ({ label, a, b, c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelE = useEnter(0, 0.3);

  // Result: pop in just after the factors land (~1.0s), then count up over ~1s.
  const resultPop = spring({
    frame: frame - 1.0 * fps,
    fps,
    config: { damping: 11, mass: 0.7, stiffness: 110 },
  });
  const resultScale = interpolate(resultPop, [0, 1], [0.55, 1]);
  const eqE = useEnter(0.95, 0.2);
  const countProgress = interpolate(frame, [1.05 * fps, 2.05 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shown = c ? formatCountUp(c, countProgress) : "";

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        backgroundColor: "transparent",
      }}
    >
      <BrandFonts />

      {label ? (
        <div
          style={{
            fontFamily: FONT.heavy,
            fontSize: 40,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: C.green,
            opacity: labelE,
            marginBottom: 56,
          }}
        >
          {label}
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Factor text={a} at={0.1} />
        <Factor text="×" at={0.45} muted />
        <Factor text={b} at={0.6} />
      </div>

      {c ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 24 }}>
          <div style={{ fontFamily: FONT.heavy, fontSize: 56, color: C.textSecondary, opacity: eqE }}>=</div>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 168,
              lineHeight: 1,
              color: C.gold,
              transform: `scale(${resultScale})`,
              fontVariantNumeric: "tabular-nums",
              marginTop: 4,
            }}
          >
            {shown}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

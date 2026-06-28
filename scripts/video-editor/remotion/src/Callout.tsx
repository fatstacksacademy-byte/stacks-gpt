/**
 * Callout — the gold "$/%" number chip, springing in and counting up.
 *
 * This is the Remotion port of the gold callout the pipeline stamps on every $ / % /
 * 100K moment (lib/captions.ts callouts + motion-gfx.py's gold result number). Unlike
 * the Python card it has a TRANSPARENT background: it's an overlay chip you drop on
 * Resolve V4/V5 (the callout track) or composite over the face with ffmpeg. Spring
 * animation (true keyframed motion) is exactly the GUI MagicZoom/keyframe pass the
 * README documents as not-scriptable — here it's just code, rendered headlessly.
 *
 * Props (all optional except value):
 *   value   the big number, e.g. "$1,500" / "100,000 pts" / "20% APY"  (counts up if numeric)
 *   label   small eyebrow above the number, e.g. "bonus" / "you earn"
 *   accent  chip accent: "gold" (default) | "green"
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./brand";
import { BrandFonts } from "./fonts";
import { formatCountUp } from "./util";

export type CalloutProps = {
  value: string;
  label?: string;
  accent?: "gold" | "green";
};

export const calloutDefaults: CalloutProps = {
  value: "$1,500",
  label: "bonus",
  accent: "gold",
};

export const Callout: React.FC<CalloutProps> = ({ value, label, accent = "gold" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accentColor = accent === "green" ? C.green : C.gold;
  const inkOnAccent = C.navyDeep; // dark text reads on gold/green like the brand chips

  // Spring the chip in (scale + slight rise + fade) — ease-out-back "pop" feel.
  const enter = spring({ frame, fps, config: { damping: 12, mass: 0.7, stiffness: 120 } });
  const scale = interpolate(enter, [0, 1], [0.6, 1]);
  const rise = interpolate(enter, [0, 1], [40, 0]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  // Count the number up over ~0.9s, starting just after the chip lands.
  const countStart = 0.12 * fps;
  const countDur = 0.9 * fps;
  const countProgress = interpolate(frame, [countStart, countStart + countDur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shown = formatCountUp(value, countProgress);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "transparent" }}>
      <BrandFonts />
      <div
        style={{
          transform: `translateY(${rise}px) scale(${scale})`,
          opacity,
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "34px 64px 40px",
          borderRadius: 28,
          background: `linear-gradient(180deg, ${accentColor} 0%, ${accent === "green" ? C.greenDeep : "#e0a93a"} 100%)`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 0 4px rgba(255,255,255,0.10) inset`,
        }}
      >
        {label ? (
          <div
            style={{
              fontFamily: FONT.heavy,
              fontSize: 40,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: inkOnAccent,
              opacity: 0.82,
              marginBottom: 2,
            }}
          >
            {label}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 168,
            lineHeight: 1,
            color: inkOnAccent,
            textShadow: "0 2px 0 rgba(255,255,255,0.25)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {shown}
        </div>
      </div>
    </AbsoluteFill>
  );
};

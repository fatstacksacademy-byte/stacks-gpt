/**
 * Bars — a two-to-four value comparison whose bars grow + count up (last bar = gold).
 *
 * Remotion port of motion-gfx.py --type bars ("75K vs 100K", right bar highlighted
 * gold). Bars grow with a spring and their value labels count up in lockstep. Title is
 * optional. Transparent background so it overlays the face/B-roll (Resolve V2-V5 or
 * ffmpeg composite). This is the third composition (beyond the required Callout + one
 * explainer) so the kit mirrors more of the motion-gfx template set.
 *
 * Props:
 *   title  optional heading, e.g. "Best-ever bonus"
 *   items  [{label, value:number}], up to 4. The LAST item renders gold (the "right now").
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, GEO } from "./brand";
import { BrandFonts } from "./fonts";

export type BarItem = { label: string; value: number };
export type BarsProps = {
  title?: string;
  items: BarItem[];
};

export const barsDefaults: BarsProps = {
  title: "Best-ever bonus",
  items: [
    { label: "Usual", value: 75000 },
    { label: "Right now", value: 100000 },
  ],
};

export const Bars: React.FC<BarsProps> = ({ title, items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clipped = items.slice(0, 4);
  const max = Math.max(1, ...clipped.map((it) => it.value));
  const maxH = 470;
  const baseY = 880;

  const titleE = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <BrandFonts />

      {title ? (
        <div
          style={{
            position: "absolute",
            top: 160,
            width: GEO.width,
            textAlign: "center",
            fontFamily: FONT.display,
            fontSize: 80,
            textTransform: "uppercase",
            color: C.white,
            opacity: titleE,
          }}
        >
          {title}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          bottom: GEO.height - baseY,
          left: 0,
          width: GEO.width,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: 170,
        }}
      >
        {clipped.map((it, i) => {
          const last = i === clipped.length - 1;
          // clamp the spring to [0,1] so the value label / bar height never overshoot the
          // target (an unclamped spring peaks ~1.01 → the count-up would flash above its final value).
          const grow = Math.min(1, spring({
            frame: frame - (0.4 + i * 0.4) * fps,
            fps,
            config: { damping: 14, mass: 0.8, stiffness: 90, overshootClamping: true },
          }));
          const bh = Math.round(maxH * (it.value / max) * grow);
          const shownVal = Math.round(it.value * grow).toLocaleString("en-US");
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 240 }}>
              {grow > 0.02 ? (
                <div
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 62,
                    color: last ? C.gold : C.white,
                    marginBottom: 10,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {shownVal}
                </div>
              ) : null}
              <div
                style={{
                  width: 240,
                  height: bh,
                  borderRadius: 14,
                  background: last ? C.gold : C.navyElev,
                }}
              />
              <div
                style={{
                  fontFamily: FONT.heavy,
                  fontSize: 36,
                  textTransform: "uppercase",
                  color: C.textSecondary,
                  marginTop: 18,
                  opacity: interpolate(frame, [(0.4 + i * 0.4) * fps, (0.8 + i * 0.4) * fps], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

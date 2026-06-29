/**
 * BigStat — one huge hero number that counts up, with an eyebrow + optional subline.
 * For the headline reveal ("$4,652 projected year one"). Transparent bg; placement-aware
 * (defaults to centre — it's the moment, not a chip — build-broll can flip it off the face).
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./brand";
import { BrandFonts } from "./fonts";
import { formatCountUp } from "./util";
import { placementStyle, Placement } from "./Callout";

export type BigStatProps = {
  value: string;
  label?: string;
  sub?: string;
  accent?: "gold" | "green";
  placement?: Placement;
};

export const bigStatDefaults: BigStatProps = {
  value: "$4,652",
  label: "projected year one",
  sub: "from one bonus",
  accent: "gold",
  placement: "center",
};

export const BigStat: React.FC<BigStatProps> = ({ value, label, sub, accent = "gold", placement = "center" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accentColor = accent === "green" ? C.green : C.gold;

  const enter = spring({ frame, fps, config: { damping: 13, mass: 0.8, stiffness: 110 } });
  const scale = interpolate(enter, [0, 1], [0.7, 1]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const countP = interpolate(frame, [0.1 * fps, 0.1 * fps + 1.0 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shown = formatCountUp(value, countP);

  return (
    <AbsoluteFill style={{ ...placementStyle(placement), backgroundColor: "transparent" }}>
      <BrandFonts />
      <div style={{ transform: `scale(${scale})`, opacity, textAlign: "center" }}>
        {label ? (
          <div style={{ fontFamily: FONT.heavy, fontSize: 54, letterSpacing: 3, textTransform: "uppercase",
            color: C.green, marginBottom: 8, textShadow: "0 3px 18px rgba(0,0,0,0.6)" }}>{label}</div>
        ) : null}
        <div style={{ fontFamily: FONT.display, fontSize: 300, lineHeight: 0.92, color: accentColor,
          textShadow: "0 8px 44px rgba(0,0,0,0.6)", fontVariantNumeric: "tabular-nums" }}>{shown}</div>
        {sub ? (
          <div style={{ fontFamily: FONT.heavy, fontSize: 46, color: "#ffffff", opacity: 0.9, marginTop: 6,
            textShadow: "0 3px 18px rgba(0,0,0,0.6)" }}>{sub}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Lower — a lower-third title bar (eyebrow chip + title) that slides in from the left.
 * For naming a card / section while he talks ("CARD #1 — Chase Sapphire Preferred").
 * Bottom-left anchored + transparent bg, so it never covers a centred face.
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./brand";
import { BrandFonts } from "./fonts";

export type LowerProps = {
  title: string;
  eyebrow?: string;
  accent?: "gold" | "green";
};

export const lowerDefaults: LowerProps = {
  title: "Chase Sapphire Preferred",
  eyebrow: "Card #1",
  accent: "green",
};

export const Lower: React.FC<LowerProps> = ({ title, eyebrow, accent = "green" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accentColor = accent === "green" ? C.green : C.gold;

  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.9, stiffness: 120 } });
  const x = interpolate(enter, [0, 1], [-90, 0]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", paddingLeft: 96, paddingBottom: 120, backgroundColor: "transparent" }}>
      <BrandFonts />
      <div style={{ transform: `translateX(${x}px)`, opacity, display: "inline-flex", flexDirection: "column" }}>
        {eyebrow ? (
          <div style={{ alignSelf: "flex-start", fontFamily: FONT.heavy, fontSize: 34, letterSpacing: 2,
            textTransform: "uppercase", color: C.navyDeep, background: accentColor, padding: "6px 18px",
            borderRadius: 8, marginBottom: 10 }}>{eyebrow}</div>
        ) : null}
        <div style={{ fontFamily: FONT.display, fontSize: 96, lineHeight: 1, color: "#ffffff",
          background: "rgba(11,18,32,0.82)", padding: "14px 28px", borderRadius: 12,
          borderLeft: `10px solid ${accentColor}` }}>{title}</div>
      </div>
    </AbsoluteFill>
  );
};

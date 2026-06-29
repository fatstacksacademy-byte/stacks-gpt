/**
 * Root — registers the Fat Stacks Academy motion-graphics compositions.
 *
 * All compositions render in the proven 1920×1080 brand coordinate space at 30fps
 * (same as motion-gfx.py). Default durationInFrames is a placeholder; render.mjs
 * overrides it per-spec via --duration so an overlay is exactly as long as the beat.
 * Every composition paints a TRANSPARENT background, so rendered to ProRes 4444 /
 * qtrle it carries an alpha channel for overlay use on Resolve V2-V5 or ffmpeg.
 */
import React from "react";
import { Composition } from "remotion";
import { GEO } from "./brand";
import { Callout, calloutDefaults } from "./Callout";
import { Value, valueDefaults } from "./Value";
import { Bars, barsDefaults } from "./Bars";
import { BigStat, bigStatDefaults } from "./BigStat";
import { Lower, lowerDefaults } from "./Lower";

const FPS = 30;
const DEFAULT_FRAMES = 4 * FPS; // 4s default; render.mjs sets the real duration per spec.

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Callout"
        component={Callout}
        durationInFrames={Math.round(2.5 * FPS)}
        fps={FPS}
        width={GEO.width}
        height={GEO.height}
        defaultProps={calloutDefaults}
      />
      <Composition
        id="Value"
        component={Value}
        durationInFrames={DEFAULT_FRAMES}
        fps={FPS}
        width={GEO.width}
        height={GEO.height}
        defaultProps={valueDefaults}
      />
      <Composition
        id="Bars"
        component={Bars}
        durationInFrames={DEFAULT_FRAMES}
        fps={FPS}
        width={GEO.width}
        height={GEO.height}
        defaultProps={barsDefaults}
      />
      <Composition
        id="BigStat"
        component={BigStat}
        durationInFrames={Math.round(3 * FPS)}
        fps={FPS}
        width={GEO.width}
        height={GEO.height}
        defaultProps={bigStatDefaults}
      />
      <Composition
        id="Lower"
        component={Lower}
        durationInFrames={DEFAULT_FRAMES}
        fps={FPS}
        width={GEO.width}
        height={GEO.height}
        defaultProps={lowerDefaults}
      />
    </>
  );
};

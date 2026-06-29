/**
 * remotion.config.ts — defaults for the Remotion CLI / Studio.
 *
 * The headless render path we ship (render.mjs) sets codec/pixel-format/profile
 * explicitly, so this config only matters if you drive the bare `npx remotion render`
 * CLI directly. We default it to the SAME alpha-capable settings so either path yields
 * a transparent overlay: ProRes 4444 + png frames (PNG carries alpha; jpeg would flatten
 * the transparent background to black).
 */
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png"); // PNG frames preserve the transparent background
Config.setCodec("prores");
Config.setProResProfile("4444"); // 4444 carries the alpha channel
Config.setPixelFormat("yuva444p10le");

/**
 * index — Remotion entry point. registerRoot wires the compositions for both the
 * Studio (`npm run studio`) and the headless renderer (render.mjs / @remotion/renderer).
 */
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);

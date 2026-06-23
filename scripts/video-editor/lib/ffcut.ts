/**
 * ffcut — cut a video to a set of keep-segments and concatenate them cleanly.
 *
 * Uses per-segment trim/atrim + concat filter with a few-ms audio fade at each
 * segment edge. This is click-free, unlike select/aselect (which drops whole
 * audio frames at each boundary and produces choppy, glitchy joins).
 *
 * The filtergraph is written to a script file and passed via -/filter_complex,
 * so it scales to hundreds of cuts without hitting command-line length limits.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export function applyCut(input: string, segs: [number, number][], out: string, fadeMs = 6, fps = 30): void {
  if (!segs.length) throw new Error('applyCut: no keep-segments');
  const fd = fadeMs / 1000;
  const parts: string[] = [];
  segs.forEach(([a, b], i) => {
    const dur = b - a;
    const foStart = Math.max(0, dur - fd).toFixed(3);
    parts.push(`[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`);
    parts.push(
      `[0:a]atrim=start=${a.toFixed(3)}:end=${b.toFixed(3)},asetpts=PTS-STARTPTS` +
        `,afade=t=in:st=0:d=${fd},afade=t=out:st=${foStart}:d=${fd}[a${i}]`
    );
  });
  const concatIn = segs.map((_, i) => `[v${i}][a${i}]`).join('');
  const graph = parts.join(';') + ';' + concatIn + `concat=n=${segs.length}:v=1:a=1[outv][outa]`;

  const scriptFile = path.join(os.tmpdir(), `ffcut-${segs.length}-${out.replace(/\W/g, '').slice(-12)}.txt`);
  fs.writeFileSync(scriptFile, graph);
  execFileSync(
    'ffmpeg',
    ['-y', '-i', input, '-/filter_complex', scriptFile, '-map', '[outv]', '-map', '[outa]',
      // Force constant frame rate + standard 48k audio: the concat filter emits
      // off-grid PTS (VFR), which makes DaVinci Resolve's importer hang at 100% CPU.
      '-r', String(fps), '-fps_mode', 'cfr', '-video_track_timescale', '30000',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      '-movflags', '+faststart', out],
    { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 30 }
  );
}

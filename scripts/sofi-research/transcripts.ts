/**
 * Pull public transcripts for a set of YouTube videos so we can study what the
 * top-performing SoFi videos actually say — hooks, structure, talking points.
 *
 * YouTube now gates caption tracks behind signed/po-token requests, so plain
 * server-side fetches return nothing. yt-dlp solves the JS challenge for us, so
 * we shell out to it for the en captions (manual or auto) and flatten json3 to
 * plain text.
 *
 * Prereq: yt-dlp on PATH (brew install yt-dlp).
 *
 * Run:  npm run sofi:transcripts                 # default top-performer set
 *       npm run sofi:transcripts -- ID1 ID2 ...  # specific video ids
 *
 * Writes one .txt per video to scripts/sofi-research/output/transcripts/.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

// The verified top performers from the views scan (id → label for the filename).
const DEFAULT_TARGETS: Record<string, string> = {
  _QzjhP4koW8: "feasible-creative-what-i-wish-i-knew-194k",
  mDQH56mArc8: "your-finance-friend-sofi-vs-ally-78k",
  "9ss1GH8SYAw": "couch-investor-honest-verdict-75k",
  e_9Ax3VMNuA: "daniel-sparks-what-i-wish-i-knew-64k",
  hiZg61K0a1s: "spencer-johnson-truth-about-sofi-2026",
  "1S23FEENng4": "ravi-wadan-savings-secret-52k",
  "-59Vj9c923E": "magnified-money-after-5-years-honest-truth",
  swpMcl2Fz_8: "greater-than-enough-best-2024-62k",
}

/** Flatten a YouTube json3 caption file to deduped plain text. */
function json3ToText(raw: string): string {
  const json = JSON.parse(raw) as { events?: Array<{ segs?: Array<{ utf8?: string }> }> }
  const lines: string[] = []
  for (const e of json.events ?? []) {
    const line = (e.segs ?? []).map((s) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim()
    // Auto-captions repeat the rolling last line; skip exact consecutive dupes.
    if (line && line !== lines[lines.length - 1]) lines.push(line)
  }
  return lines.join(" ").replace(/\s+/g, " ").trim()
}

/** Run yt-dlp to drop en caption json3 into a temp dir; return its text or "". */
function fetchTranscript(videoId: string): { text: string; kind: string } {
  const dir = join(tmpdir(), `sofi-tx-${videoId}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  try {
    execFileSync(
      "yt-dlp",
      [
        "--skip-download",
        "--write-sub", // creator-provided captions (preferred)
        "--write-auto-sub", // fall back to auto-generated
        "--sub-lang",
        "en.*", // en, en-US, en-GB, …
        "--sub-format",
        "json3",
        "--no-warnings",
        "-o",
        join(dir, "%(id)s.%(ext)s"),
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { stdio: ["ignore", "ignore", "ignore"], timeout: 120_000 },
    )
  } catch {
    /* yt-dlp exits non-zero if no subs at all — fall through to the file check */
  }
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json3")) : []
  if (!files.length) {
    rmSync(dir, { recursive: true, force: true })
    return { text: "", kind: "none" }
  }
  // Prefer a manual track (filename lacks the auto marker) over auto-generated.
  const manual = files.find((f) => !/auto/i.test(f))
  const chosen = manual ?? files[0]
  const text = json3ToText(readFileSync(join(dir, chosen), "utf8"))
  rmSync(dir, { recursive: true, force: true })
  return { text, kind: manual ? "manual" : "auto" }
}

function main() {
  const argIds = process.argv.slice(2).filter((a) => !a.startsWith("--"))
  const targets: Record<string, string> = argIds.length
    ? Object.fromEntries(argIds.map((id) => [id, id]))
    : DEFAULT_TARGETS

  const outDir = join("scripts", "sofi-research", "output", "transcripts")
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  console.log(`\n📝 Fetching transcripts for ${Object.keys(targets).length} videos via yt-dlp…\n`)
  let ok = 0
  for (const [id, label] of Object.entries(targets)) {
    const { text, kind } = fetchTranscript(id)
    if (!text) {
      console.log(`  ✗ ${id} (${label}) — no captions available`)
      continue
    }
    const words = text.split(/\s+/).length
    const file = join(outDir, `${label}.txt`)
    writeFileSync(
      file,
      `# ${label}\n# https://www.youtube.com/watch?v=${id}\n# captions: ${kind} · ${words} words\n\n${text}\n`,
    )
    console.log(`  ✓ ${id} (${label}) — ${words} words [${kind}]`)
    ok++
  }
  console.log(`\n✓ ${ok}/${Object.keys(targets).length} transcripts → ${outDir}\n`)
}

main()

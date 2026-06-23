# DaVinci Resolve Effects Cookbook

Engineering spec for the scripted video-editing pipeline in `scripts/video-editor/`.
For each high-retention editing effect: what it does, the exact manual GUI recipe, whether
it is reachable through the Resolve **Python scripting API** (and with which methods), and the
source tutorial(s)/docs that taught it.

**Scope of "scriptable":** the pipeline drives Resolve via `DaVinciResolveScript` (see
`scripts/video-editor/build_resolve.py`). The authoritative API surface is the on-disk
`README.txt` at
`/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/README.txt`
(1129 lines, Resolve 20/21). All API method names below were verified against that file.

### Legend
- `API ✅` — fully reproducible from Python with documented methods.
- `API ⚠️ partial` — the *insertion/placement/styling skeleton* is scriptable, but the
  retention-defining motion/animation is not exposed and must be GUI-authored once (then reused).
- `GUI-only ❌` — no API path; must be done by hand or by importing a pre-built artifact.

---

## Key API facts established up front (these drive every tag below)

**What the API CAN do (verified in README.txt):**
- `MediaPool.AppendToTimeline([{clipInfo}])` — place a clip on a specific `trackIndex` at a
  specific `recordFrame`, video- or audio-only (`mediaType` 1/2). (Already used in `build_resolve.py`.)
- `Timeline.AddTrack("video"|"audio"|"subtitle")`, `GetItemListInTrack`, `GetTrackCount`.
- `Timeline.InsertTitleIntoTimeline(titleName)` and
  `Timeline.InsertFusionTitleIntoTimeline(titleName)` → return a `TimelineItem`. This is how
  Text+/Fusion-title clips (callouts, lower-thirds) get added by name.
- `Timeline.InsertFusionGeneratorIntoTimeline`, `InsertFusionCompositionIntoTimeline`, `InsertGeneratorIntoTimeline`.
- `Timeline.CreateSubtitlesFromAudio({autoCaptionSettings})` → AI captions (Studio only).
  Settings keys: `resolve.SUBTITLE_LANGUAGE`, `resolve.SUBTITLE_CAPTION_PRESET`,
  `resolve.SUBTITLE_CHARS_PER_LINE` (1–60, default 42). (Already wired as `--captions`.)
- `Timeline.SetVoiceIsolationState(trackIndex, {isEnabled, amount})` (Studio). (Already used.)
- `Timeline.DetectSceneCuts()` — auto scene cuts.
- `TimelineItem.SetProperty(key, value)` for **static** Transform values:
  `ZoomX`, `ZoomY`, `ZoomGang`, `Pan`, `Tilt`, `RotationAngle`, `AnchorPointX/Y`,
  `Pitch`, `Yaw`, `CropLeft/Right/Top/Bottom`, `CropSoftness`, `Opacity`, `Distortion`,
  `DynamicZoomEase` (LINEAR/IN/OUT/IN_AND_OUT), `CompositeMode`, `Scaling`, `ResizeFilter`.
- `TimelineItem.AddFusionComp()`, `ImportFusionComp(path)`, `GetFusionCompByIndex/Name`,
  `LoadFusionCompByName` — attach/load a Fusion comp to a clip. Combined with
  `resolve.Fusion()` (full Fusion scripting object) you can `AddTool`/`SetInput` on a comp's nodes.
- Color/grade: `TimelineItem.GetNodeGraph(layerIdx)` → `Graph.SetLUT(nodeIndex, lutPath)`,
  `Graph.ApplyGradeFromDRX(path, gradeMode)` (apply a PowerGrade still), `Graph.GetNumNodes`,
  `Graph.ApplyArriCdlLut`; `TimelineItem.SetCDL({...})`, `CopyGrades([items])`,
  color groups (`AssignToColorGroup`); `Project.RefreshLUTList()`.
- Markers: `Timeline.AddMarker(frame, color, name, note, duration, customData)` (chapter/structure).

**What the API CANNOT do — the load-bearing gaps:**
1. **No Transform keyframes.** `SetProperty("ZoomX"/"ZoomY"/...)` sets a *single static value*
   for the whole clip. There is **no `recordFrame`/offset argument** and **no `AddKeyframe`
   method** for Transform/Crop/Opacity. The only keyframe-aware getters in the API are
   stereo-3D-specific (`GetStereoConvergenceValues` etc.). → **Animated punch-in zoom is not
   directly scriptable** and must come from a Fusion comp or be GUI-authored.
2. **No Text+ text-content / style setters at the Edit-page Inspector level.** You can *insert*
   a Text+ title by name, but setting its string, font, color, stroke from the Edit Inspector
   has no API. Text content must be set via the Fusion comp (`Tool:SetInput("StyledText", ...)`
   through `resolve.Fusion()`) or via a templated `.drfx`/`.setting` imported with
   `ImportFusionComp`.
3. **No transition API.** There is no method to add a cross-dissolve, wipe, or custom
   Fusion-clip transition between two clips. Transitions are GUI-only (or import a Fusion clip).
4. **No audio fader/keyframe/ducking API.** No clip-gain, no track-fader, no
   side-chain/normalization methods exist. Audio levels & ducking are GUI/Fairlight-only.
5. **No "apply LUT to whole timeline" one-shot.** `SetLUT` is per-clip / per-node on each
   `TimelineItem`'s graph; a timeline-wide grade is scripted by *looping over every clip* (or by
   GUI: a single adjustment-clip / Color-page group).

---

## 1. Jump cuts / ruthless trim
**Retention:** removes dead air and breaths so every second earns its place — the single
biggest retention lever for talking-head content.

**Exact Resolve steps (GUI):**
1. On the Edit/Cut page, play the A-roll; mark in/out around filler ("um", restarts, pauses).
2. Blade (`Cmd/Ctrl+B`) at each boundary; select the dead segment and ripple-delete
   (`Shift+Delete`) to close the gap.
3. Cut page "Detect Scene Cuts" or the smart-trim tools speed this up for multi-clip footage.
4. (Studio) Edit > "Remove silence"/transcript-based editing can pre-cut by transcript.

**Scriptable?** `API ⚠️ partial`.
- You can *cut* programmatically: place A-roll in slices via multiple
  `AppendToTimeline([{mediaPoolItem, startFrame, endFrame, recordFrame}])` calls (exactly the
  pattern `build_resolve.py` already uses to place sub-ranges). Build the keep-list from a
  transcript/plan and only append the kept ranges → effectively a scripted ruthless trim.
- `Timeline.DetectSceneCuts()` auto-blades scene changes. `Timeline.DeleteClips([items], True)`
  ripple-deletes. There is no "remove filler words" API — the *decision* must come from your
  plan/transcript; the API just realizes it as kept ranges.

**Source(s):** General edit-page practice; mechanic = the slice-append loop already in
`build_resolve.py`. (No single tutorial; this is the spine the rest hangs on.)

---

## 2. Clean line captions — the chosen default style
**Retention:** persistent, readable one/two-line captions hold sound-off viewers and reinforce
keywords without the visual noise of bouncing word-by-word text.

**Exact Resolve steps (GUI):**
1. Timeline menu > **AI Tools > Create Subtitles from Audio** (Studio only). Set **words-per-line**
   (Alex Pettitt uses 15; default 42 chars/line). Click **Create** → static, correctly-timed captions.
2. Fix any mis-transcribed word: click the caption, open **Inspector**, edit text inline.
3. Style: select the **subtitle/caption track in the Track Header**, open the **Video Inspector**,
   set font, size, white fill, stroke/outline, and bottom-center position. Leave animation OFF for
   the "clean line" default.

**Scriptable?** `API ✅ (generation) / ⚠️ (styling)`.
- Generation: `Timeline.CreateSubtitlesFromAudio({resolve.SUBTITLE_CHARS_PER_LINE: 30, ...})`
  — already wired behind `--captions` in `build_resolve.py`. Studio-gated.
- Styling (font/stroke/position) of the caption track: **no documented API**. Set the look once
  via a saved subtitle style/preset in the GUI, or accept Resolve's default. Tag styling `GUI-only`.

**Source(s):** *Animated Subtitles In DaVinci Resolve 20 | Full Tutorial* — Alex Pettitt,
https://www.youtube.com/watch?v=ApKlyi18tVE (18.4K) [`alex-pettitt-ApKlyi18tVE.txt`]; Larry Jordan,
https://larryjordan.com/articles/create-animated-captions-using-davinci-resolve-20/.

---

## 3. Word-by-word animated captions (alternative)
**Retention:** karaoke/highlight-as-spoken captions are the CapCut/TikTok look; maximize sound-off
retention and feel "native" to short-form. Use as the alt style, not the default (busier).

**Exact Resolve steps (GUI):**
1. Generate captions as in §2.
2. **Effects > Titles > Subtitles > Animated** — five native presets (Resolve 20 Studio):
   **Lollipop, Rotate, Slide In, Statement, Word Highlight**. Drag one onto the caption track header.
3. Select the caption track, Inspector, click the **Track** button (track-wide animation/timing,
   font, color) vs the **Caption** button (single caption). Word Highlight colors the spoken word;
   customize fill (white), highlight background (e.g. red box), box size/roundness/softness.
4. To swap styles: delete the animation in the Inspector (returns to static), drag a different preset.

**Plugin alternative (MrAlexTech MagicSubtitles, Studio 20+ only):** Effects > Titles >
**Magic Toolkit > Magic Subtitles** → drop a template (≈30 in Pro), pick the audio track in the
Inspector, choose **Compound (full track)** or **Section only**, hit **Transcribe** → word-by-word
animated subs on the timeline, fully Text+ customizable (all-caps, remove-punctuation, per-word
highlight color, camera-shake). Lite = free forever, single "SingleLine" template; Pro = $30,
Studio-only. Install: double-click the `.drfx`, Resolve prompts to install; included fonts must be
installed separately (Font Book / right-click Install).

**Scriptable?** `API ⚠️ partial`.
- The caption generation is scriptable (§2). The native **Animated preset application is GUI-only**
  — there is no API to attach a Titles>Animated effect to a subtitle track.
- MagicSubtitles is a `.drfx` Fusion template driven by its own Inspector UI + Resolve's
  transcription engine; **not scriptable** from the public API.

**Source(s):** Alex Pettitt (above); *Animated Subtitles in an instant?! FREE (and Pro!) Subtitle
Plugin…* — MrAlexTech, https://www.youtube.com/watch?v=Aievzj4Y92E (56.7K) [`mralextech-Aievzj4Y92E.txt`];
Larry Jordan, https://larryjordan.com/articles/animate-subtitles-in-davinci-resolve-20/ (names the 5 formats);
https://www.mralextech.com/freeresolveplugins.

---

## 4. Punch-in zoom (10–15% scale) on emphasis
**Retention:** a small, smooth push-in on a punchline/key point re-grabs attention and signals
"this matters" — the workhorse retention move for talking-head.

**Two GUI recipes (both verified, Dunna Did It):**

*Method A — Inspector keyframes (fast, simple, for in-then-out or cut-after):*
1. Select clip → **Inspector** (top-right). Click the **keyframe diamond** next to **Zoom** at the
   start frame (adds keyframe at Zoom 1.0).
2. Move forward ~10 frames; type Zoom **1.3** (~30%) — or 1.10–1.15 for a subtle 10–15% punch.
   Keep X/Y **ganged** so you don't stretch the frame.
3. **Do NOT keyframe Position** to recenter (it bounces and shows a black bar) — instead drop the
   **Anchor Point Y** to reframe; the anchor auto-returns on zoom-out, no extra keyframes.
4. Smooth it: right-click the first keyframe > **Ease Out**, the second > **Ease In** (or open the
   spline/curve editor and apply ease). Optional zoom-out: add a keyframe later, +10 frames back to 1.0.

*Method B — Fusion adjustment clip with Transform (more control, motion blur, multi-point moves):*
1. Effects > Toolbox > **Adjustment Clip**, drag it over the target clip(s) on a track above.
2. Right-click > **Open in Fusion page**. Click MediaIn, `Shift+Space` > **Transform (XF)** > Add
   (auto-inserts between MediaIn/MediaOut).
3. Keyframe **Size** on Transform (1.0 → 2.0 over ~10 frames). Pan via **Center**; keyframe Center
   for "zoom here, then move there."
4. Open the **spline** panel, zoom-to-fit, box-select the keyframes, press **S** to smooth (ease).
5. Transform **Settings > Motion Blur** (Quality up to 10) for a realistic camera push.

*Plugin alt — MrAlexTech MagicZoom v3 (no keyframing):* Effects > **Adjustment Clip** → drop
**MrAlexTech > Magic Zoom v3** on it → it auto zoom-in/holds/zoom-out. Set zoom point via the
**Fusion overlay** under the viewer; speed/zoom/easing/motion-blur in Inspector > Effects.
Stackable (zoom-and-hold + hold-and-zoom-out as modular blocks); apply directly to a clip for PiP.

**Scriptable?** `GUI-only ❌` for the *animation*. **Critical finding:** the API has no Transform
keyframes (only static `SetProperty("ZoomX"/"ZoomY", v)`). Options for the pipeline:
- Pre-build a parameterized **Fusion Transform comp** (`.comp`/`.setting`) once in the GUI, then per
  beat: `TimelineItem.ImportFusionComp(path)` onto an adjustment clip and, if exposed, set its
  keyframe inputs via `resolve.Fusion()` (`Tool:SetInput` with a keyframe spline). This is `API ⚠️
  partial` and requires authoring the comp by hand first.
- A *static* emphasis push (no animation) IS scriptable: `SetProperty("ZoomX", 1.12)` +
  `SetProperty("ZoomY", 1.12)` on the beat's clip — acceptable as a cheap fallback.

**Source(s):** *GRAB THEIR ATTENTION… Easy Smooth Zoom* — Dunna Did It,
https://www.youtube.com/watch?v=etPAxdxrMlU (425.7K) [`dunna-did-it-etPAxdxrMlU.txt`];
*How To Make PUNCH IN Zoom* — Molin Guides, https://www.youtube.com/watch?v=jSbQylOYGJE (5.9K)
[`molin-guides-jSbQylOYGJE.txt`]; *Rapid Zoom Effect* — MSKedits,
https://www.youtube.com/watch?v=_0oioAUtshI (440) [`mskedits-_0oioAUtshI.txt`];
MagicZoom: *One ZOOM to RULE them all* — MrAlexTech, https://www.youtube.com/watch?v=qdJGyytQaoU
(28.9K) [`mralextech-qdJGyytQaoU.txt`]; Larry Jordan keyframes,
https://larryjordan.com/articles/add-and-modify-keyframes-in-davinci-resolve-20/.

---

## 5. Gold number/keyword callouts (Text+ pop-ins on $/%/K)
**Retention:** animated colored callouts on dollar amounts, percentages, and "K" hold the eye on the
exact number you're saying — perfect for bank-bonus/credit-card content.

**Exact Resolve steps (GUI):**
1. Effects > Titles > **Text+** → drag to a video track above the face at the beat. Type the number
   (e.g. "$900").
2. Inspector: set font, gold fill, stroke/outline (Ryan Osborne shows individual-word color + stroke
   on the Text+ node). Position near the spoken subject.
3. Animate the pop-in: open in Fusion, right-click the text box > add a **Follower** modifier;
   Transform tab > set Type to **Word**; keyframe Size X/Y 0→1 over ~10 frames; Timing tab >
   **Delay 2** for word-by-word; spline > ease (Outback Cubic overshoot = a "pop"). Motion blur in
   text-node Settings. (This is the Edit-page-reusable custom-effect Ryan ships.)

**Scriptable?** `API ⚠️ partial`.
- Insert the title: `Timeline.InsertFusionTitleIntoTimeline("Text+")` (or a custom title name) →
  returns a `TimelineItem` you can place. ✅
- Set the *text string / color*: no Edit-Inspector API. Use the Fusion route — get the comp
  (`GetFusionCompByIndex(1)` / `AddFusionComp()`), then via `resolve.Fusion()` find the Text+ tool
  and `Tool:SetInput("StyledText", "$900")`, `SetInput("Red1"/"Green1"/"Blue1", ...)`. ⚠️ (needs the
  Fusion object; not a one-liner).
- The **pop animation (Follower)** is GUI-only; bake it once into a template title (`.drfx`/`.setting`)
  with the text as an exposed input, drop it with `InsertFusionTitleIntoTimeline(<templateName>)`,
  then set only the string via Fusion. → Recommended: ship one "gold-callout" template, script the
  text only.

**Source(s):** *Word by Word Animations IN ONE Text Node!* — Ryan Osborne,
https://www.youtube.com/watch?v=GZnKtd-pbq4 (106.9K) [`ryan-osborne-GZnKtd-pbq4.txt`];
*Animate TEXT Like a Pro - 5 Fusion Techniques* — Ryan Osborne,
https://www.youtube.com/watch?v=zEfBJTlvmPE (118.5K) [`ryan-osborne-zEfBJTlvmPE.txt`];
*Create a Fusion Text Animation (Made WAY Easier)* — William Justice,
https://www.youtube.com/watch?v=ubq1dGW0Nzo (4.2K) [`william-justice-ubq1dGW0Nzo.txt`].

---

## 6. Purpose-driven b-roll inserts
**Retention:** cutting to relevant b-roll/screen-recording exactly when you reference it keeps the
visual fresh and proves the claim (e.g. show the card's application page on screen).

**Exact Resolve steps (GUI):**
1. Import b-roll/screen-rec to Media Pool.
2. Place it on V2 over the section it illustrates; trim to the spoken window; duck the face audio
   under it (§9). Keep cuts purposeful (one idea per insert), not decorative.

**Scriptable?** `API ✅`. This is exactly what `build_resolve.py` already does:
`MediaPool.ImportMedia([path])` then `AppendToTimeline([{mediaPoolItem, startFrame, endFrame,
trackIndex:2, recordFrame, mediaType:1}])`, keyed off beat windows (it even force-places desktop
screen recordings per card). Dedupe of adjacent identical b-roll is already handled. The only
non-scriptable part is the *editorial choice* of which b-roll for which beat (comes from the plan).

**Source(s):** Existing pipeline `scripts/video-editor/build_resolve.py` (V2 b-roll placement
logic). No external tutorial needed.

---

## 7. Whoosh/riser SFX on cuts & zooms
**Retention:** a short whoosh on a transition or zoom "sells" the motion and gives an audio cue that
re-captures wandering attention; risers build anticipation into a reveal.

**Exact Resolve steps (GUI):**
1. Drop a whoosh/riser audio clip (e.g. from freesound.org) onto an audio track. SFX packs often
   arrive as one long file — **blade** out the single whoosh you want.
2. Place it straddling the cut/zoom (lead-in slightly before the visual hit, landing on the beat).
3. Right-click > apply a short **crossfade** in/out if the cut isn't clean; set the track/clip level
   by ear vs the music bed (no fixed dB).

**Scriptable?** `API ✅ (placement) / ❌ (level & fades)`.
- Placement: `AppendToTimeline([{mediaPoolItem: whooshItem, startFrame, endFrame, trackIndex,
  recordFrame, mediaType: 2}])` — audio-only on an SFX track, anchored to the same `recordFrame`
  as the cut/zoom beat. This is the same primitive the pipeline already uses for video.
- **Clip gain and crossfades have no API** → set levels/fades in the GUI (or pre-normalize the SFX
  files so default placement sits right). A separate SFX track keeps them easy to ride manually.

**Source(s):** *How to Add Whoosh Transition Sound Effects* — Justin Odisho,
https://www.youtube.com/watch?v=WpJrSfhVOfQ (61.2K) [`justin-odisho-WpJrSfhVOfQ.txt`];
*DaVinci Resolve 16 SOUND EFFECTS Editing Tutorial* — Jason Yadlovski,
https://www.youtube.com/watch?v=MNO1jAdIFz8 (20.6K) [`jason-yadlovski-MNO1jAdIFz8.txt`].

---

## 8. J-cuts / L-cuts
**Retention:** letting the *audio* of the next clip start before its picture (J), or the previous
audio run under the next picture (L), smooths transitions so cuts feel intentional, not jarring —
reduces the "stop" feeling that triggers drop-off.

**Exact Resolve steps (GUI):**
1. Unlink audio from video on the relevant clips (or edit on separate tracks).
2. Trim the audio edit point earlier (J) or later (L) than the video edit point so they overlap by a
   few frames. On the Edit page, drag the audio half of the clip past the video half.

**Scriptable?** `API ⚠️ partial`.
- Because `AppendToTimeline` places video and audio with **independent `recordFrame` and
  `mediaType`**, you can append the next clip's audio (mediaType 2) a few frames *before* its video
  (mediaType 1) — a scripted J-cut — and similarly extend the prior clip's audio under the next
  video for an L-cut. `SetClipsLinked` controls linking.
- It's fiddly (you manage two record frames per edit) and the pipeline's spine is one A-roll clip, so
  J/L between A-roll segments is only relevant if you slice A-roll into multiple clips. Mark as
  achievable but low-priority for a talking-head spine.

**Source(s):** General edit-page technique (no dedicated tutorial in the downloaded set;
flagged as a gap — see "unverified"). Mechanic inferred from `AppendToTimeline` clipInfo semantics
in README.txt.

---

## 9. Music ducking
**Retention:** automatically lowering the music bed under speech keeps dialogue intelligible; muddy
audio is a top drop-off cause.

**Exact Resolve steps (GUI):**
1. Fairlight page: on the **music track**, add a **Dynamics > Compressor** and enable
   **Side Chain**, keyed off the dialogue bus/track → music auto-ducks when you talk.
2. Or manual: keyframe the music **clip volume** down under VO sections (rubber-band on the clip).

**Scriptable?** `GUI-only ❌`. **There is no audio-level, fader, keyframe, or side-chain/compressor
API in the README.** Voice *Isolation* on dialogue is scriptable (`SetVoiceIsolationState`, already
used) and helps intelligibility, but it does not duck music. Ducking must be a Fairlight side-chain
template applied by hand (or pre-duck the music file before import).

**Source(s):** Fairlight side-chain is standard Resolve audio practice; not covered by the visual
tutorials downloaded (flagged gap). API absence verified against README.txt audio surface.

---

## 10. Smooth section transitions (dip / morph / wipe)
**Retention:** a deliberate transition between sections (vs a hard cut) signals "new chapter" and
keeps momentum across topic changes. Use sparingly — most cuts should stay hard cuts.

**Exact Resolve steps (GUI):**
*Simple:* drag a **Cross Dissolve** / **Dip to Color** from Effects > Video Transitions onto a cut.

*Buttery whip (Fusion-clip method, BR Media Pro):*
1. Trim ~6 frames off the end of clip A; overlap clip B on top; blade so they share that window.
2. Select both > right-click > **New Fusion Clip** > open in Fusion.
3. Add a **Transform** to each (MediaIn1/MediaIn2 → Merge). Keyframe **Center X**: clip A 0 → 1
   (slides out), clip B −1 → 0 (slides in) over ~5 frames.
4. Open **spline**, select keyframes, press **F**, drag the handles into a sharp "L" curve for an
   abrupt-but-smooth ease.
5. Add **Directional Blur** on the Merge; keyframe its **Length** up over the transition for motion
   blur that "sells" the whip. Land the transition on a music beat.

**Scriptable?** `GUI-only ❌`. **No transition API exists** (no add-cross-dissolve, no
add-Fusion-transition method). Workarounds:
- `CreateFusionClip([timelineItems])` can *create* a Fusion clip from two items, but you still must
  author the Transform/blur comp by hand (no keyframe API).
- Pragmatic pipeline rule: **default to hard cuts** (free, scriptable, high-retention) and reserve
  authored transitions for manual polish passes. A pre-built transition `.drfx` could be imported,
  but placement-between-two-clips is still manual.

**Source(s):** *The KEY to SMOOTH TRANSITIONS!* — BR Media Pro,
https://www.youtube.com/watch?v=RB3A5Ca64XU (381.2K) [`br-media-pro-RB3A5Ca64XU.txt`];
*Easy & Smooth Transitions In Fusion Page* — Molin Guides,
https://www.youtube.com/watch?v=JlCS12_g9s4 (12.8K) [`molin-guides-JlCS12_g9s4.txt`];
*Smooth Wipe Transition* — Game Guides, https://www.youtube.com/watch?v=4DDZcS-HqTE (4.7K)
[`game-guides-4DDZcS-HqTE.txt`].

---

## 11. Consistent color grade / LUT / PowerGrade
**Retention:** a consistent, pleasing look reads as "professional" and reduces the subconscious
"amateur → skip" signal; not a direct retention spike but a baseline trust factor.

**Exact Resolve steps (GUI):**
1. Color page: grade one clip (or build a node tree); right-click the thumbnail > **Grab Still** →
   save as a **PowerGrade** in the Gallery.
2. Apply across the timeline: select all clips > right-click the PowerGrade still >
   **Apply Grade**; or use a single **Adjustment Clip** on a top track with the grade/LUT on it; or
   put clips in a **Color Group** and grade the group's clip node once.
3. For a LUT: Color page node > right-click > **LUT** > pick (e.g. a creative/film LUT); or apply via
   the node's LUT dropdown. Custom LUTs go in the LUT folder; refresh the list.

**Scriptable?** `API ✅ (with a per-clip loop)`. Verified methods:
- `Project.RefreshLUTList()` to register a custom LUT path.
- Per clip: `ti.GetNodeGraph(1).SetLUT(nodeIndex, lutPath)` — apply a LUT to a node of each clip.
- PowerGrade: `ti.GetNodeGraph(1).ApplyGradeFromDRX(drxPath, gradeMode)` (gradeMode 0 = no
  keyframes) — applies a saved grade still to a clip's graph.
- `ti.SetCDL({...})` for slope/offset/power/sat; `srcTi.CopyGrades([dstTis])` to propagate one
  grade to many; color groups via `AssignToColorGroup`.
- **No single "grade the whole timeline" call** → iterate `GetItemListInTrack("video", 1)` and apply
  per clip, OR (simpler) script-place ONE adjustment clip spanning the timeline and `SetLUT` /
  `ApplyGradeFromDRX` on *its* graph so every clip below inherits the look. The adjustment-clip route
  is the recommended one-LUT-for-all approach.

**Source(s):** README.txt (`Graph.SetLUT`, `ApplyGradeFromDRX`, `Project.RefreshLUTList`,
`SetCDL`, `CopyGrades`); no dedicated tutorial downloaded (API-derived, flagged as not video-sourced).

---

## 12. Open-loop / hook + chapter structure
**Retention:** a cold-open hook + an unresolved "open loop" (tease the payoff) front-loads the reason
to keep watching; chapter markers structure the arc and improve YouTube engagement/seek.

**Exact Resolve steps (GUI):**
1. Edit the strongest 3–8s as a cold open at the top; place a TITLE card for the hook.
2. Add **timeline markers** at section boundaries (`M`); name them = chapters. Export with chapter
   markers / use the names for the YouTube description timestamps.

**Scriptable?** `API ⚠️ partial`.
- Structure realization is scriptable: place the hook clip + TITLE cards via `AppendToTimeline` /
  `InsertTitleIntoTimeline` (pipeline already places TITLE/GRAPHIC cards), and add chapter markers
  with `Timeline.AddMarker(frame, color, name, note, duration, customData)`.
- The *content* of the hook/open-loop (what to tease) is an editorial/scripting decision from the
  plan, not an API capability.

**Source(s):** Editorial best practice (matches the project's "open-loop hook + chapter" memory);
marker mechanic verified in README.txt. No tutorial in the downloaded set (flagged).

---

# Summary Table A — Retention impact per effort for a SCRIPTED pipeline

Ranked by (retention impact) ÷ (effort to script), highest-leverage first.

| Rank | Effect | Retention impact | Scriptability | Recommendation |
|---|---|---|---|---|
| 1 | #1 Jump cuts / ruthless trim | Very high | `API ⚠️` (kept-range append loop) | **Do first** — already the pipeline's primitive; drive from transcript. |
| 2 | #6 Purpose-driven b-roll | High | `API ✅` | **Already shipped** in `build_resolve.py`; just feed good plan windows. |
| 3 | #2 Clean line captions | High (sound-off) | `API ✅` gen / `GUI` style | **Do** — `CreateSubtitlesFromAudio`; accept default style or one saved preset. |
| 4 | #7 Whoosh/riser SFX | Medium-high | `API ✅` place / `GUI` level | **Do** — append audio-only SFX on beat frames; pre-normalize files. |
| 5 | #11 Color grade / LUT | Medium (trust) | `API ✅` (1 adjustment clip + SetLUT) | **Do** — one adjustment clip, `ApplyGradeFromDRX`/`SetLUT`. |
| 6 | #12 Hook + chapter markers | High (front-load) | `API ⚠️` (markers + cards) | **Do** — `AddMarker` + existing TITLE placement; content from plan. |
| 7 | #4 Punch-in zoom | Very high | `GUI ❌` anim / `API` static only | **Author once as a Fusion template**, import per beat; static zoom fallback. |
| 8 | #5 Gold number callouts | High | `API ⚠️` (insert + Fusion text set) | **Ship one template title**, script the string via `resolve.Fusion()`. |
| 9 | #3 Word-by-word captions | High (short-form) | `GUI ❌` (native presets / plugin) | Manual or MagicSubtitles; not scriptable. Use for shorts only. |
| 10 | #8 J/L cuts | Medium | `API ⚠️` (dual recordFrame) | Low priority for single-A-roll spine; manual in polish. |
| 11 | #10 Section transitions | Medium | `GUI ❌` (no transition API) | **Default to hard cuts**; author whips by hand sparingly. |
| 12 | #9 Music ducking | Medium-high | `GUI ❌` (no audio API) | Fairlight side-chain template by hand, or pre-duck music. |

**Net pipeline strategy:** the scriptable spine = ruthless trim (append kept ranges) + b-roll
placement + captions + SFX placement + one-adjustment-clip LUT + chapter markers + TITLE/hook cards.
The two highest-value GUI-only effects (animated punch-in zoom, word-by-word captions) are best
handled by **building reusable templates once** (Fusion zoom comp; gold-callout title; MagicSubtitles)
and importing/placing them, leaving only fine motion/level work for a manual polish pass.

---

# Summary Table B — Verified tutorial shortlist

All view counts are REAL (YouTube Data API via `compare-ids.ts`, fetched 2026-06-21).
Transcripts in `scripts/video-editor/effects-research/transcripts/`.

| Title | Creator | URL | Views | Technique it taught | Transcript file |
|---|---|---|--:|---|---|
| GRAB THEIR ATTENTION… Easy Smooth Zoom | Dunna Did It | https://www.youtube.com/watch?v=etPAxdxrMlU | 425.7K | #4 Punch-in zoom (Inspector keyframe + Anchor Point ease; Fusion adjustment-clip Transform + motion blur) | `dunna-did-it-etPAxdxrMlU.txt` |
| The KEY to SMOOTH TRANSITIONS! | BR Media Pro | https://www.youtube.com/watch?v=RB3A5Ca64XU | 381.2K | #10 Whip transition (Fusion clip + Transform Center keyframes + spline + Directional Blur) | `br-media-pro-RB3A5Ca64XU.txt` |
| Animate TEXT Like a Pro - 5 Fusion Techniques | Ryan Osborne | https://www.youtube.com/watch?v=zEfBJTlvmPE | 118.5K | #5 Text+ design (color per word, stroke) + Fusion text animation | `ryan-osborne-zEfBJTlvmPE.txt` |
| Word by Word Animations IN ONE Text Node! | Ryan Osborne | https://www.youtube.com/watch?v=GZnKtd-pbq4 | 106.9K | #3/#5 Follower modifier word-by-word scale-in, ease (Outback Cubic), motion blur | `ryan-osborne-GZnKtd-pbq4.txt` |
| How to Add Whoosh Transition Sound Effects | Justin Odisho | https://www.youtube.com/watch?v=WpJrSfhVOfQ | 61.2K | #7 Whoosh SFX: blade a single whoosh, place on cut, crossfade, level by ear | `justin-odisho-WpJrSfhVOfQ.txt` |
| Animated Subtitles in an instant?! (MagicSubtitles) | MrAlexTech | https://www.youtube.com/watch?v=Aievzj4Y92E | 56.7K | #3 MagicSubtitles plugin (Studio 20, compound-clip transcribe, ~30 templates, free Lite/$30 Pro) | `mralextech-Aievzj4Y92E.txt` |
| One ZOOM to RULE them all! (MagicZoom v3) | MrAlexTech | https://www.youtube.com/watch?v=qdJGyytQaoU | 28.9K | #4 MagicZoom: adjustment-clip seamless zoom, Fusion overlay framing, stack/modular zoom-hold, PiP | `mralextech-qdJGyytQaoU.txt` |
| DaVinci Resolve 16 SOUND EFFECTS Editing | Jason Yadlovski | https://www.youtube.com/watch?v=MNO1jAdIFz8 | 20.6K | #7 SFX sourcing & layering a sequence | `jason-yadlovski-MNO1jAdIFz8.txt` |
| Animated Subtitles In DaVinci Resolve 20 \| Full Tutorial | Alex Pettitt | https://www.youtube.com/watch?v=ApKlyi18tVE | 18.4K | #2/#3 Native Create Subtitles from Audio + Animated presets (Word Highlight), styling | `alex-pettitt-ApKlyi18tVE.txt` |
| Easy & Smooth Transitions In Fusion Page | Molin Guides | https://www.youtube.com/watch?v=JlCS12_g9s4 | 12.8K | #10 Speed ramp + Fusion transition | `molin-guides-JlCS12_g9s4.txt` |
| How To Make PUNCH IN Zoom Effect | Molin Guides | https://www.youtube.com/watch?v=jSbQylOYGJE | 5.9K | #4 Adjustment-clip + Transform + Zoom keyframe + motion blur | `molin-guides-jSbQylOYGJE.txt` |
| DaVinci Resolve Smooth Wipe Transition | Game Guides | https://www.youtube.com/watch?v=4DDZcS-HqTE | 4.7K | #10 Wipe transition (Fusion) | `game-guides-4DDZcS-HqTE.txt` |
| Create a Fusion Text Animation (Made WAY Easier) | William Justice | https://www.youtube.com/watch?v=ubq1dGW0Nzo | 4.2K | #5 Simpler Fusion text animation | `william-justice-ubq1dGW0Nzo.txt` |
| ROLLING TEXT Animation (Fusion) | Hishaam Ahmed | https://www.youtube.com/watch?v=Up-IUkY-Ds4 | 3.6K | #5 Rolling text animation in Fusion | `hishaam-ahmed-Up-IUkY-Ds4.txt` |
| How To Add A Zoom Effect (Magic Zoom) | Dwyer.Creatives | https://www.youtube.com/watch?v=iwupmK6WqC4 | 1.5K | #4 3rd-party MagicZoom adjustment-clip demo | `dwyer-creatives-iwupmK6WqC4.txt` |
| Rapid Zoom Effect / Camera Punch | MSKedits | https://www.youtube.com/watch?v=_0oioAUtshI | 440 | #4 Adjustment-clip Transform zoom keyframe (short) | `mskedits-_0oioAUtshI.txt` |

**Authoritative written sources (WebFetch'd):**
- Larry Jordan — Create Animated Captions (DR20): https://larryjordan.com/articles/create-animated-captions-using-davinci-resolve-20/
- Larry Jordan — Animate Subtitles (DR20), names the 5 formats: https://larryjordan.com/articles/animate-subtitles-in-davinci-resolve-20/
- Larry Jordan — Add & Modify Keyframes (DR20): https://larryjordan.com/articles/add-and-modify-keyframes-in-davinci-resolve-20/
- MrAlexTech — Free Resolve Plugins (MagicZoom/MagicSubtitles/MagicAnimate): https://www.mralextech.com/freeresolveplugins
- Blackmagic — Scripting README (local): `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/README.txt`

---

# Flagged / unverified

- **Candidate IDs:** all 9 provided IDs returned valid stats + transcripts — **none were bogus.**
  They skewed toward text-animation / transitions / SFX (no captions or zoom), which is why the
  gap-search was needed. (zEfBJTlvmPE, GZnKtd-pbq4, ubq1dGW0Nzo, Up-IUkY-Ds4 = text anim;
  RB3A5Ca64XU, JlCS12_g9s4, 4DDZcS-HqTE = transitions; MNO1jAdIFz8, WpJrSfhVOfQ = SFX.)
- All 16 transcripts had **manual captions** (none missing). The 5 short ones
  (MSKedits 76 words, Dwyer 402, Molin punch-in 356, Justin Odisho 201, Game Guides intro) are
  thin but on-topic.
- **#8 J/L cuts, #9 music ducking, #11 grade, #12 structure** have **no dedicated downloaded
  tutorial** — recipes are from standard Resolve practice + README API, not a video source. Flagged.
- **Transform keyframe API:** confirmed absent in README.txt — this is the single most important
  constraint. Animated zoom and any keyframed Transform move are GUI-only (or pre-built Fusion comp).
- **Caption/Text+ styling via API:** insertion is scriptable, but font/stroke/color/position of
  captions and Text+ from the Edit Inspector have no documented setters — style via Fusion or a
  saved preset/template.
- MrAlexTech free-plugins page did not expose exact `.drfx` menu paths in text; the install path
  (double-click `.drfx`, appears under Effects > Titles > Magic Toolkit, fonts installed separately)
  comes from the MagicSubtitles video transcript, not the page.

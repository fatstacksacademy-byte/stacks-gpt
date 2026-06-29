# Recording Checklist — Fat Stacks Academy

The repeatable capture recipe for talking-head videos. Goal: real 4K picture, clean mic audio, locked sync, minimal post-fixing.

---

## Before you hit record

- [ ] **iPhone set to 4K** — Settings → Camera → Record Video → **4K at 30 fps** (or 60 if you want slow-mo headroom). Use the **Blackmagic Camera** app for manual focus/exposure lock on talking-head (see below).
- [ ] **Good mic recording separately** — the phone's built-in audio is a *reference track only*. Record real audio on the dedicated mic into the computer/recorder.
- [ ] **48 kHz everywhere** — mic interface AND iPhone both at 48 kHz. Mismatched sample rates (44.1 vs 48) cause sync that drifts over a long take (fine at the start, lips off by the end).
- [ ] **Frame the shot, lock focus/exposure** so it doesn't hunt mid-take.

## Rolling

- [ ] **Clap once on camera** before you start talking. Sharp waveform spike on both tracks = your manual sync safety net.
- [ ] Keep takes **sectioned** — re-clap per section if it's a long shoot. Pairs with "last take wins": keep the last take per section, cut earlier ones.

## Sync in post (DaVinci Resolve — primary pipeline)

1. Drop iPhone clip + good-mic audio onto the timeline (or select both in Media Pool).
2. Select both → **right-click → Auto Sync Audio → Based on Waveform**.
3. **Disable/delete the iPhone reference audio** so only the good mic plays.
4. Use **Append** to link them as one clip so they move together.

### Or in Descript
Import both → select video + external audio → **Sync** (waveform match) → mute the camera track.

## If recording live through OBS instead

- [ ] **Audio Sync Offset** — OBS → Audio Mixer → ⋮ on mic → Advanced Audio Properties → Sync Offset (ms). Camera latency makes audio arrive *early*; enter a **positive** ms value to delay audio to match lips.
- [ ] **Find the exact offset** with the clap test: clap, scrub frame-by-frame, measure gap between clap *sound* and *hands meeting* — that's your offset.
- [ ] **Canvas + Output = 3840×2160** (Settings → Video). If either is 1080p you get 1080p no matter the source.
- [ ] iPhone into OBS needs **Camo (USB)** or **NDI HX Camera** for 4K — Continuity Camera is hard-capped at 1080p.
- [ ] **Record to MKV**, remux to MP4 after. MP4 desyncs/corrupts on a hiccup.

---

## Dialed-in values (fill in once measured)

- OBS audio Sync Offset: `___ ms` (clap-test result)
- Mic gain / level: `___`
- Mic + interface model: `___`

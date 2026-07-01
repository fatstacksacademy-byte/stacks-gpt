# Install Stacks OS on your phone (the "app" that isn't in an app store)

Stacks OS is a **PWA** — a web app that installs straight to your home screen. No
App Store, no Play Store, no download, no waiting on Apple/Google review. You tap
a button, it lands an icon on your home screen, and it opens **full-screen with no
browser bars** — looks and feels exactly like a native app, including push
notifications for bonus deadlines.

Same site (`fatstacksacademy.com/stacksos`), two ways to install depending on the
phone.

---

## 📱 iPhone / iPad (Safari)

Apple only allows install from **Safari** — not Chrome/Firefox on iOS.

1. Open **`fatstacksacademy.com/stacksos`** in **Safari**.
2. Tap the **Share** button — the □ with the ↑ arrow, at the bottom of the screen.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** (top-right).
5. Open **Stacks OS** from your home screen — it launches full-screen like an app.

> On iPhone, Stacks OS shows a little **"Install app"** hint bottom-left that pops
> these exact steps. You still tap through Safari's Share sheet manually — Apple
> doesn't let a website trigger the install for you.

**Push notifications on iPhone:** require iOS **16.4+** and only work *after* you've
added it to the home screen. Once installed, open it and tap **"Get alerts."**

---

## 🤖 Android (Chrome / Edge)

Android is the easy one — the browser can install with a single tap.

1. Open **`fatstacksacademy.com/stacksos`** in **Chrome**.
2. Tap the green **"📲 Install app"** button (bottom-left) — *or* Chrome's own
   banner if it pops up.
3. Tap **Install** in the confirmation dialog.
4. Stacks OS lands on your home screen and in your app drawer. Open it — full-screen,
   no browser bars.

> If the button doesn't appear, use Chrome's **⋮ menu → Install app / Add to Home
> Screen**. (The button hides itself once the app is already installed.)

**Push notifications on Android:** work out of the box once installed — tap
**"Get alerts."** No OS-version gymnastics like iOS.

---

## 🎥 For the demo / video

The "it's an app but there's no app store" moment is the hook. Suggested on-camera flow:

**The reveal (≈20–30s):**
1. Start in the browser on the Stacks OS dashboard. Say the line: *"This isn't in
   the App Store — watch this."*
2. Tap **Install app** → tap **Install/Add** → cut to the **home screen** with the
   green **$** icon sitting next to your real apps.
3. Tap the icon → it **opens full-screen, no address bar.** That's the payoff shot —
   viewers clock instantly that it looks native.
4. Optional kicker: trigger a **push notification** (bonus-deadline alert) so it
   buzzes on the lock screen. "It'll even tap you on the shoulder before a deadline."

**Shot tips:**
- Record the phone screen natively (iOS: Control Center screen record; Android: built-in
  recorder) — cleaner than filming the glass.
- Do the install on a **fresh phone / new browser profile** so the button actually shows
  (it hides after install and stays dismissed for a session). To reset it: uninstall the
  icon, or clear the site's storage in browser settings, or open a private/incognito tab.
- The green **$** home-screen icon + brand-green splash are already wired, so the launch
  animation is on-brand out of the box.
- Best contrast for the "vs. a normal website" point: film the **iPhone** version — the
  full-screen-no-Safari-bars jump is the most visually obvious.

**One-liner for the description / pin:** *"Stacks OS installs straight to your home
screen — no app store, no download. iPhone: Safari → Share → Add to Home Screen.
Android: tap Install."*

---

## Under the hood (for reference)

Everything that makes install work already ships in this repo:

- `app/manifest.ts` — web app manifest (name, icons, standalone display, brand colors)
- `public/sw.js` — service worker: offline fallback + push notifications
- `app/components/ServiceWorkerRegistrar.tsx` — registers the SW in production
- `app/components/InstallButton.tsx` — the in-app **Install app** button (Android
  `beforeinstallprompt` capture + iOS Safari Share-sheet hint)
- `app/icon.tsx` / `app/apple-icon.tsx` — the green **$** home-screen icons

No native build, no Xcode/Android Studio, no store submission. It's the same URL you
already ship — the manifest + service worker are what let the browser "install" it.

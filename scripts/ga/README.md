# `scripts/ga` — website Google Analytics (GA4) reporter

Pulls **fatstacksacademy.com**'s GA4 data via the Data API and prints a
plain-English snapshot: headline KPIs vs the prior period, a **hostname split**
that fences out localhost/preview traffic, top pages, traffic sources, devices,
and a daily trend.

```bash
npm run ga:report            # last 28 days vs the prior 28
npm run ga:report -- 7d      # last 7 days
npm run ga:report -- 90d
npm run ga:report -- today
npm run ga:report -- yesterday
```

Output → `scripts/ga/output/report-<end-date>.md`.

---

## Heads-up: two Google accounts

The GA property and the YouTube channel are owned by **different** accounts:

| Resource | Account |
|---|---|
| GA4 property (this site) | `fatstacksacademy@gmail.com` |
| YouTube channel + OAuth client / `YT_REFRESH_TOKEN` | `booth.nathaniel@gmail.com` |

A refresh token only reads what **its** account can access, so pick one path:

- **Option A — link them.** Add `booth.nathaniel@gmail.com` as a **Viewer** on
  the GA property, then reuse the YouTube token. One token, both APIs.
- **Option B — keep them separate.** Mint a dedicated `GA_REFRESH_TOKEN` as
  `fatstacksacademy@gmail.com` via `npm run ga:auth`. Nothing is linked.

The Cloud project (where the APIs are enabled) stays `booth.nathaniel`'s either
way — no new project, no service-account JSON.

## One-time setup (≈5 min)

### 1. Enable the APIs (both options)

In **Google Cloud Console**, in the SAME project as your `YT_CLIENT_ID`, enable:
- **Google Analytics Data API** — https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com
- **Google Analytics Admin API** — https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com  *(used by `ga:props`)*

### 2. Get a token that can read GA

**Option A (link):** GA Admin → Property Access Management → add
`booth.nathaniel@gmail.com` as **Viewer**. Then re-mint the shared token (the
`analytics.readonly` scope is now in `YT_SCOPES`), signing in **as booth**:

```bash
npm run linksync:auth     # approve Analytics → paste YT_REFRESH_TOKEN=… into .env.local
```

> Your YouTube tooling keeps working — the new token is a superset of the old scopes.

**Option B (separate):** mint a GA-only token, signing in **as fatstacksacademy**:

```bash
npm run ga:auth           # approve Analytics → paste GA_REFRESH_TOKEN=… into .env.local
```

> If the OAuth consent screen is "External / Testing", first add
> `fatstacksacademy@gmail.com` under **Audience → Test users**, or Google blocks consent.

### 3. Add the numeric property id to `.env.local`

Let the tool find it for you — it matches your `G-2FD6TC1TWH` stream to its
numeric property id automatically:

```bash
npm run ga:props      # prints "GA_PROPERTY_ID=123456789" — paste it into .env.local
```

(Or read it manually from **GA Admin → Property Settings → "PROPERTY ID"**, the
number top-right — **not** the `G-2FD6TC1TWH` measurement id.)

```
GA_PROPERTY_ID=123456789
```

Optional override (defaults shown):

```
GA_SITE_HOSTNAME=fatstacksacademy.com,www.fatstacksacademy.com
```

---

## About "how much of this is just me?"

- **Localhost / Vercel previews** show up under their own hostnames. The headline
  numbers are filtered to the production hostnames above, and the **"Where the
  traffic lives"** table shows exactly how much was dev/preview and excluded.
- **Your own visits to the *live* site** can't be excluded retroactively by the
  API. To strip those going forward, set up an internal-traffic filter in
  **GA Admin → Data Streams → (your stream) → Configure tag settings → Show all →
  Define internal traffic** (by your IP), then activate
  **Admin → Data Settings → Data Filters → "Internal Traffic" → Active**.

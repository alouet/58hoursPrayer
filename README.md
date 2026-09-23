# Money Doesn't Deserve My Time™ — 58 Hours of Seeking God

A prayer and faith-journey Progressive Web App based on the book
**_Money Doesn't Deserve My Time_ by Alouet Appolinaire Ndehem**.

> I am not sowing hours. I am sowing seeds.
> Money doesn't deserve my time. God's will does.

The app keeps your data on your device first. It works offline, installs to a phone's home screen, and has no required backend and no dependencies.

---

## What's inside

| Area | Highlights |
|---|---|
| **Dashboard** | Hero progress ring (58:00:00 goal, completed and remaining), hours sown, sessions and streak, plus 12 widgets you can reorder or hide (use **Arrange**: arrow buttons, or drag on desktop) |
| **Prayer timer** | Timestamp-based, so it survives tab switches, screen lock, sleep and reloads. Pause and resume, −15 / −5 / +5 / +15 minutes (never below 00:00:00), 10 session modes, and optional screen wake lock |
| **Prayer Room / Focus Mode** | Six cinematic backgrounds (Night Sky, Mountain, Quiet Room, Ocean, Garden, Sunrise), Scripture, a declaration, the seed tree and gentle prompts (*Be still → Seek → Listen → Write → Obey*). Includes quick notes, full screen and ambient sound |
| **Session end** | *Seed sown* → total → remaining → the tree grows. Then "What did you sow today?", a journal box, tags and a category |
| **Seed Journey** | A procedural tree with 7 stages (Seed → Abundant). It shows faithfulness, not financial returns |
| **Today** | Daily target ring, completed and remaining time, today's timeline and a GitHub-style heatmap |
| **Analytics** | Week bars against your target, cumulative line, last 30 days, heatmap, averages, streaks and consistency, plus a **projected completion date** based on your real pace |
| **Scripture** | 36 passages in 12 themes (translation shown on every verse; "as quoted in the book" where the wording comes from the manuscript). Includes 14 dated **book principles** quoted word for word, and a meditation mode (Read → Meditate → Declare → Pray → Journal) with a verse timer |
| **Declare** | 10 personal declarations with tap-to-reveal, swipe, shuffle, favorites, repeat counter and "declared today". You can add your own |
| **The Flow** | The Vision Account (below), a dotted world map where streams and amounts in local currencies flow from 7 regions to your mission, a luminous river that branches into Business, Clients, Ideas and more, a full-screen globe with the live balance and the "I am not chasing money…" sequence, and **Vision Mode** |
| **Vision Account** | A balance in your home currency (FCFA by default) that grows with every minute of prayer, in real time while the timer runs. It shows equivalents in $ and €, running totals in 17 currencies (USD, EUR, GBP, AED, NGN, JPY and more), a feed of inflows from 24 cities, and amounts floating over the world map. Set the currency, the target amount and the hours it takes to reach it in *Vision settings*. Exchange rates are fixed approximations |
| **Real provision log** | Real events you enter yourself, shown in a separate, visibly different table |
| **Journal & Testimonies** | 10 categories, tags, search, favorites and Markdown export. Testimonies have 12 categories |
| **Achievements & milestones** | 13 badges, celebrations at 1/5/10/20/30/40/50/55 hours, and a full 58-hour completion experience |
| **Goals** | Multiple journeys (hours, days, sessions or a custom unit) that you can create, edit, duplicate, archive, delete and activate |
| **Settings** | Fonts (8 quick pairings, or separate fonts for titles and Scripture, interface, and timer numbers, plus 4 text sizes), Light/Dark/Auto, 8 themes plus a custom accent, reduced motion, daily targets, prayer windows, ambient sound (synthesized, works offline), reminders with an .ics calendar export, sync, JSON/CSV export and import, delete all, and a PIN lock |

---

## Project structure

```
index.html            App shell (semantic HTML, loads modules in order)
styles.css            Design system (tokens per theme and mode)
manifest.json         PWA manifest
service-worker.js     Offline cache (bump VERSION on each deploy)
icons/                App icons (192, 512, maskable, apple-touch, favicon.svg)
js/
  worldmap.js         Land mask for the world map (Natural Earth, public domain)
  util.js             DOM helpers, formatting, dates, toasts, modals, icons
  storage.js          StorageService: IndexedDB + localStorage mirror, import/export
  sync.js             Cloud sync layer (adapter-based; nothing is faked)
  timer.js            Background-safe timer (timestamps, wake lock, recovery)
  goals.js            Journeys: progress math and the Goals screen
  declarations.js     Declarations, philosophy, encouragement
  scriptures.js       Scripture library, book principles, meditation mode
  sound.js            Web Audio ambient sound (rain, ocean, fire, forest, pad)
  visualization.js    Seed tree, world map, river, globe, Vision Mode, celebrations
  achievements.js     Badges, milestones, completion trigger
  analytics.js        Stats, streaks, projection, SVG charts
  vision.js           Vision Account: multi-currency balance, inflows, live counter
  prayer.js           Pray screen, Prayer Room, session end, history
  journal.js          Journal, testimonies, real provision log
  notifications.js    Gentle reminders and .ics export
  settings.js         Settings, themes, data tools, PIN lock
  pwa.js              Service worker registration and install prompt
  app.js              Boot, router, Dashboard, Today, Seed, Flow, opening
build.py              Builds single-file versions into dist/
dist/                 Single-file builds (no service worker)
```

The modules are plain scripts that share one namespace (`window.MDT`). There is no build step, and they are easy to inline, which is how `build.py` makes the single-file versions.

---

## Run locally

Service workers need `http(s)://` (not `file://`):

```bash
cd money-doesnt-deserve-my-time
python3 -m http.server 8080
# open http://localhost:8080
```

To try it without a server, open `dist/money-doesnt-deserve-my-time.html` directly. Everything works except offline caching and installing.

## Deploy

All of these hosts serve the folder as static files. No configuration is needed.

- **Netlify:** drag the folder onto <https://app.netlify.com/drop>.
- **Vercel:** `npx vercel` inside the folder (framework preset: *Other*).
- **GitHub Pages:** push to a repository, then go to Settings → Pages → Deploy from branch (root).
- **Cloudflare Pages:** create a project, connect the repository or upload the folder directly. The build command is empty and the output directory is `/`.

After you deploy an update, change `VERSION` in `service-worker.js` so installed copies refresh.

### Install on a phone

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** the ⋮ menu → *Install app* (or the **Install app** button in Settings).

### Wrap as a native app later

- **Capacitor:** `npm i @capacitor/core @capacitor/cli && npx cap init`, set `webDir` to this folder, then `npx cap add ios` / `npx cap add android`. The native Keep Awake and Local Notifications plugins can then replace the web versions.
- **PWABuilder** (<https://www.pwabuilder.com>) can package the deployed URL for the Play Store or Microsoft Store.

---

## Timer reliability (how it works)

The timer never counts ticks. It stores timestamps:

```
elapsed = accumulatedMs + (running ? Date.now() - segmentStart : 0) + creditMs
```

- Every change is written to `localStorage` immediately (synchronous), mirrored to IndexedDB.
- On `visibilitychange`, `pageshow`, `focus` and `resume`, the display is recalculated and the wake lock is requested again.
- If the phone or browser kills the page, the next launch restores the session. The time that passed is counted, because it is computed from the start timestamp.
- Each session's id is created at start and reused when it is saved, so it can't be saved twice.

**Honest limits:** browsers cannot always stop a screen from locking. Screen Wake Lock works in current Chrome, Edge, Safari 16.4+ and Android browsers, and *"Screen awake enabled where supported"* is shown. Where it isn't available, the timer is still accurate because it uses timestamps.

## Reminders (honest limits)

A web app can't schedule notifications while it is fully closed unless it has a push server. Reminders fire while the app is open or running in the background. **Settings → Reminders → Add to calendar (.ics)** creates repeating calendar alarms that arrive even when the app is closed.

---

## Multi-device sync

The app is local-first and works without sync. To keep devices in step, point it at **your own** HTTPS endpoint (**Settings → Sync across devices**):

```
GET  <endpoint>   → 200 { goals, sessions, journal, testimonies, provisions, declarations, scripture, achievements, meta }   (404 if empty)
PUT  <endpoint>   ← same JSON body
Header (optional): Authorization: Bearer <token>
```

Merging works per record, using `updatedAt` (the newest version wins). Deletions are tombstones (`deleted: true`), so a delete also syncs. Settings (theme, PIN, credentials) stay on each device. If the network drops, changes stay saved locally and the header shows **Offline — changes saved locally**.

### Minimal Cloudflare Worker (free tier, KV storage)

```js
// wrangler.toml: kv_namespaces = [{ binding = "JOURNEY", id = "<your-kv-id>" }]
// Set a secret: wrangler secret put TOKEN
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.headers.get('Authorization') !== 'Bearer ' + env.TOKEN) return new Response('Unauthorized', { status: 401, headers: cors });
    if (req.method === 'GET') {
      const v = await env.JOURNEY.get('data');
      return v ? new Response(v, { headers: { ...cors, 'Content-Type': 'application/json' } }) : new Response('', { status: 404, headers: cors });
    }
    if (req.method === 'PUT') { await env.JOURNEY.put('data', await req.text()); return new Response('ok', { headers: cors }); }
    return new Response('Method not allowed', { status: 405, headers: cors });
  }
};
```

Supabase, Firebase or any other backend works as well. Register an adapter in `sync.js`:

```js
MDT.Sync.register('supabase', { pull: async (cfg) => snapshotOrNull, push: async (cfg, snapshot) => {} });
```

---

## Privacy

- Data lives in this browser's IndexedDB and localStorage. It leaves only when you export or turn on sync.
- **Export my data** downloads `money-doesnt-deserve-my-time-backup.json`, which contains goals, sessions, journal, declarations, Scripture favorites, achievements, statistics, settings and testimonies. The PIN hash and sync token are left out. **Sessions (CSV)** exports your prayer log as a spreadsheet.
- **Import** validates the file first, then lets you choose *Merge* or *Replace*.
- **Delete all data** requires you to type `DELETE`.
- The **PIN lock** is a privacy screen (the PIN is stored as a salted SHA-256 hash). It does not encrypt your data.

## Content notes

- **Scripture:** each verse shows its translation. Wording from the manuscript is marked *as quoted in the book*.
- **Book principles:** quoted word for word from the manuscript, with the date and place of each entry.
- **Personal declarations:** first-person confessions inspired by the book. They are not quotations.
- **Vision Account:** its amounts are calculated from your prayer time and your chosen target. Real provision appears only when you log it yourself, in a separate table.

## Accessibility

Semantic landmarks, labelled controls, keyboard support (Space pauses in the Prayer Room, Esc leaves it, arrow keys move through declarations and Vision Mode), visible focus rings, state shown by more than color alone, and **reduced motion** (follows the device setting, or can be set in Settings).

## Tested

In Chromium at phone (390×844) and desktop (1440×900) sizes:

- **Timer:** start, pause, resume, +5 minutes, reload mid-session, a simulated 40-minute sleep, end, and a second end (no duplicate).
- **Sessions:** manual log (triggers the 1-hour milestone) and editing.
- **Goals:** create, activate and delete a days-based goal.
- **Data:** export, delete all, import (merge), reject an invalid backup, and persistence across reload.
- **Other:** journal search, declaring, PIN lock and unlock, every screen in light and dark mode, theme switching, globe, Vision Mode, celebration, completion experience and the opening experience.
- **Single-file build:** loads correctly.

No console errors, apart from Google Fonts being unreachable in the offline test environment. The app then falls back to system fonts.

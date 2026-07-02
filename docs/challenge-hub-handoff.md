# Challenge Hub Handoff — SummerFit 2026 as the Hybrid-Challenge Reference

**Audience:** the agent/developer building the new challenge-hub web app.
**Purpose:** capture everything from the existing `running-challenge` repo that must not get lost — the challenge history, the SummerFit 2026 hybrid-challenge mechanics (the best template for future hybrid challenges), the design system / CSS, and the CI/deploy setup — so the new app keeps the same touch and feel.

Source repo: `andyb4m/running-challenge` (static site + Netlify Functions + Firestore).

---

## 1. Architecture of the existing app (what the hub replaces/extends)

```
public/                          ← static site, deployed as-is (no build step)
  index.html                     ← landing page ("FitChallenge") listing all challenges
  assets/css/global.css          ← design tokens + shared components (nav, buttons, cards)
  assets/css/pages.css           ← landing-page sections (hero, steps, stats, footer)
  assets/js/navigation.js        ← hardcoded challenge registry + card rendering
  assets/js/global.js            ← small utilities (smooth scroll, date format)
  assets/js/animations.js        ← scroll/entrance animations
  challenge/<slug>/index.html    ← ONE self-contained page per challenge
                                    (inline <style> + inline <script>, no shared JS)
netlify/functions/*.js           ← Node 18 serverless functions (firebase-admin ^11.8.0)
netlify.toml                     ← build/deploy config
```

Key architectural facts:

- **No framework, no bundler, no npm build for the frontend.** Plain HTML/CSS/JS. Chart.js and Font Awesome come from CDNs; the Inter font from Google Fonts.
- **Each challenge is a copy-pasted, self-themed HTML page** with its own inline CSS overriding the global design tokens. This is the main pain the hub should fix (centralize tokens + components), but the *visual result* should stay the same.
- **Backend = Netlify Functions + Firestore.** One Firestore collection per challenge. Functions are initialized with `FIREBASE_SERVICE_ACCOUNT` (JSON service account in a Netlify env var).
- **No auth.** Participants are a hardcoded `<select>` of first names. Anti-abuse is a honeypot field + server-side rate limits (+ reCAPTCHA in the oldest challenge only, `RECAPTCHA_SECRET_KEY`).

## 2. Challenge history (do not lose this)

The registry lives in `public/assets/js/navigation.js` (hardcoded array). All four challenges so far:

| # | Title | Slug / URL | Dates | Firestore collection | Endpoints | Scoring model |
|---|-------|------------|-------|----------------------|-----------|---------------|
| 1 | Ultimate Running Challenge 2025 | `/challenge/running/` | 2025-08-01 → 2025-09-30 | (via `addRun`/`getRanking`/`getActivities`) | `addRun`, `getRanking`, `getActivities`, `parseActivity` | Zones only: Z2×0.5, Z4×1.0, Z5×2.0 pts/min. Used reCAPTCHA. |
| 2 | Ending the year with a BANG (Winter 2025) | `/challenge/winter-2025/` | 2025-11-01 → 2025-12-31 | `winter-challenge-2025` | `addWinterActivity`, `getWinterRanking`, `getWinterActivities` | Zones Z2×0.5, Z4×1.56, Z5×2.76 + flat activities: Others 10 pts (1/day), Recovery 5 pts (1/week). First hybrid. |
| 3 | Chinese New Year Challenge 2026 — Get Fit or Die | `/challenge/2026-fitness/` | 2026-02-01 → 2026-03-30 | (shared the `*Fitness*` functions before they were repointed) | `addFitnessActivity`, `getFitnessRanking`, `getFitnessActivities` | Zones Z2×1.0, Z3×0.5, Z4×1.5, Z5×2.0 + Others 20 pts (1/day), Recovery 30 pts (1/week). |
| 4 | **SummerFit Challenge 2026 — Train Hard, Shine Bright** | `/challenge/2026-summerfit/` | 2026-05-01 → 2026-06-30 (registry has a typo: `endDate: '2025-6-30'`) | `summerfit-2026` | `addFitnessActivity`, `getFitnessRanking`, `getFitnessActivities` (repointed to the new collection) | See section 3 — the reference hybrid model. |

Statuses: all four are now `ended`/completed. Participants across challenges: Andy, Batz, Caro, Eleana, Hans, Jakob, Mane (SummerFit roster; earlier challenges had subsets, e.g. Stefan H. appears in the landing-page leaderboard mock).

⚠️ Gotcha the hub must fix: the `*Fitness*` functions were **reused and repointed** from the CNY challenge to SummerFit (`COLLECTION_NAME = 'summerfit-2026'`), so the CNY page's read endpoints now return SummerFit data. The hub needs stable per-challenge data access (e.g. collection name as a parameter/config, never repurposed).

## 3. SummerFit 2026 — the hybrid challenge reference

Page: `public/challenge/2026-summerfit/index.html`. Backend: `netlify/functions/addFitnessActivity.js`, `getFitnessRanking.js`, `getFitnessActivities.js`. "Hybrid" = heart-rate-zone training **plus** flat-point activity types **plus** a behavior-shaping bonus.

### 3.1 Activity types & scoring

1. **Zone Training** (h:m:s time per zone, converted to decimal minutes client-side):
   - Zone 2 → **1.0 pt/min**
   - Zone 3 → **0.5 pt/min**
   - Zone 4 → **1.5 pts/min**
   - Zone 5 → **2.0 pts/min**
   - At least one zone must be > 0. No submission limit.
2. **Others** (gym, cycling, whatever) — two duration tiers picked via pill buttons:
   - ≥30 min → **20 pts**, ≥60 min → **40 pts**
   - No daily limit in the final rules (the daily-limit check exists in code but is only enforced for recovery).
3. **Recovery** (yoga, stretching, sauna…) → **30 pts**, **max once per calendar week (Mon–Sun)**, enforced server-side via a `dateString` range query.

### 3.2 The 80/20 bonus (the signature mechanic)

Computed **client-side in the ranking renderer** (not stored):

- Low intensity = total Z2 minutes + (30 min credited per recovery activity).
- High intensity = total Z4 + Z5 minutes. (Z3 and Others are excluded from the ratio.)
- If low intensity is **70–85%** of (low + high), the player's total points get a **×1.15 bonus**, shown as `⭐+15%` in a Bonus column.
- The Analytics table shows each player's low/high ratio with green (`ratio-good`) or red (`ratio-poor`) badges and explains the 80/20 rule in an info box.

### 3.3 Data model (Firestore doc in `summerfit-2026`)

```js
{
  name: 'Andy',
  activityType: 'zone-training' | 'others' | 'recovery',
  timestamp: <serverTimestamp>,
  dateString: 'YYYY-MM-DD',        // for rate-limit range queries
  date: 'DD/MM/YYYY',              // display (en-GB)
  z2, z3, z4, z5: <decimal minutes, 0 for non-zone>,
  z2_display ... z5_display: 'h:mm:ss',
  zonePoints: <number>,            // points for THIS activity (all types)
  othersDuration: '30' | '60'      // only on Others activities
}
```

`getFitnessRanking` aggregates the whole collection server-side into per-player `{ totalZ2..totalZ5, totalPoints, activityCount, lastActivity }`, sorted by points. `getFitnessActivities` returns raw activities newest-first.

### 3.4 Page layout (the look & feel to reproduce)

Top → bottom, desktop = 2-column CSS grid (`.desktop-layout`, breakpoint 992px), mobile = stacked cards:

1. **Challenge nav bar** — blurred dark bar, "← Back to Challenges" left, title with themed icon (`fa-sun`) center.
2. **Status banner** — one of: `challenge-upcoming` (cyan info box) / `challenge-completed` (red box: "Challenge Completed! … Check out the final ranking below."). When completed, a DOM script disables every form input and swaps the form title to a 🔒 "Challenge Completed".
3. **Log Your Activity card** (left) — runner `<select>`, hidden honeypot field, 3 activity-type pill buttons with icons (`fa-running`, `fa-dumbbell`, `fa-spa`), zone time inputs as 4 stat-cards with h:m:s segment inputs (auto-advance focus, zero-padding on blur, `×N points per minute` captions), duration pills for Others, gradient submit button ("Submit and get fit!" with `fa-fire`), inline status message div (success/error/warning styles).
4. **Current Ranking card** (right) — table: Rank (🏆 after rank 1), Runner, Points, Activities, Z2–Z5 times, Bonus (⭐+15%).
5. **Training Analytics card** (full width) — per-player activity counts + low/high intensity ratio with colored badges + 80/20 info box.
6. **Progress Chart card** (full width) — Chart.js line chart, cumulative points over time per player, summer color palette `['#f97316','#06b6d4','#fbbf24','#ec4899','#10b981','#8b5cf6','#f43f5e','#3b82f6']`, dark grid `#334155`, tick/label color `#94a3b8`, Inter font, axis titles "Zeit" / "Gesamtpunkte".
7. **Recent Activities card** (full width) — last 10 activities, "View All Activities" toggle button.

### 3.5 Frontend patterns worth keeping

- **Single dashboard fetch + cache:** `fetchDashboardData()` hits ranking + activities **once, in parallel**, caches for 15 s, and all four renderers (`renderRanking`, `renderActivities`, `renderAnalytics`, `renderProgressChart`) are pure functions taking that data. "View All" re-renders from cache with no network call. (This replaced 6 fetches per page load — keep this discipline in the hub.)
- **Honeypot anti-spam:** visually hidden `website` input, rejected client- and server-side if non-empty.
- **Optimistic UX:** loading spinner on the submit button, success message auto-clears after 3 s, dashboard force-refreshes 500 ms after a successful submit, runner selection preserved after submit.
- **Copy is bilingual-casual** (mostly English UI, some German: "Wähle die Dauer", "Punkte", "Zeit", "Gesamtpunkte") with emoji in success messages ("☀️", "💪", "🧘"). Keep the playful tone.

## 4. Design system (the "touch and feel")

### 4.1 Base tokens — `public/assets/css/global.css`

Dark theme, Inter font, indigo/purple brand:

```css
--primary-color:#6366f1; --primary-dark:#4f46e5; --primary-light:#8b5cf6;
--secondary-color:#06d6a0; --secondary-dark:#059669;
--background-dark:#0f0f23; --background-secondary:#1a1a2e;
--card-background:#16213e; --card-hover:#1e2749;
--text-primary:#fff; --text-secondary:#94a3b8; --text-muted:#64748b;
--border-color:#334155; --border-light:#475569;
--success-color:#10b981; --warning-color:#f59e0b; --error-color:#ef4444; --info-color:#3b82f6;
--gradient-primary:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);
--gradient-hero:linear-gradient(135deg,#0f0f23 0%,#1a1a2e 50%,#16213e 100%);
--shadow-glow:0 0 20px rgba(99,102,241,.3);
/* spacing: xs .25rem / sm .5rem / md 1rem / lg 1.5rem / xl 2rem / 2xl 3rem */
/* radius: sm .375rem / md .5rem / lg .75rem / xl 1rem / 2xl 1.5rem */
/* transitions: fast .15s / normal .3s / slow .5s (all ease) */
```

### 4.2 Per-challenge theming pattern (how SummerFit got its summer look)

Each challenge page **redefines the same token names** in its inline `:root`, so all shared component styles re-skin automatically. SummerFit's overrides:

```css
--primary-color:#06b6d4; --primary-dark:#0891b2; --primary-light:#22d3ee;  /* ocean/turquoise */
--secondary-color:#fbbf24; --secondary-dark:#f59e0b;                       /* sun yellow */
--summer-accent:#f97316; --summer-light:#fb923c;                           /* sunset coral */
--summer-gradient:linear-gradient(135deg,#f97316 0%,#ec4899 100%);         /* coral→pink; buttons/accents */
--background-dark:#0c1629; --background-secondary:#16213a;                 /* warm dusk navy */
--card-background:#1b2a48; --card-hover:#223456;
/* legacy aliases used throughout the page CSS: */
--purple-accent:var(--summer-accent); --purple-gradient:var(--summer-gradient);
```

**Recommendation for the hub:** keep exactly this mechanism — one shared component sheet + a small per-challenge theme file that only overrides `--primary-*`, accent, gradient, and background tokens.

### 4.3 Component recipes

- **Cards** (`.card-section` / `.card`): `background:var(--card-background)`, 1px `--border-color` border, radius `--radius-xl` (1rem), heavy soft shadow `0 20px 25px -5px rgba(0,0,0,.3)`; hover → `translateY(-4px)`, accent border, deeper shadow.
- **Primary buttons:** full-width, 14px padding, accent gradient background, white 600-weight text, radius `--radius-md`; hover → `translateY(-2px)` + colored glow (`0 0 20px rgba(<accent>,.4)`); disabled → `opacity:.6`. Always icon + label (Font Awesome 6.4.0).
- **Selector pills** (activity types, duration tiers, landing filters): grid/flex of buttons, dark background, 2px border, muted text; `.active` → filled with accent (or accent gradient) + white text; hover → accent border. Icons above labels on the activity pills.
- **Form inputs:** dark background, 1px border, 12px padding, 16px Inter (prevents iOS zoom); focus → accent border + `0 0 0 3px rgba(<accent>,.15)` ring, no outline. Custom `▼` on selects via `.select-wrapper::after`. Number-input spinners suppressed.
- **h:m:s time segments:** 30×36px monospace boxes with `:` separators, tiny uppercase unit labels under each, auto-advance and zero-pad behaviors (see §3.4).
- **Data tables** (`.table-wrapper` + `.data-table`): wrapper is `overflow-x:auto` with subtle `rgba(255,255,255,.02)` background; uppercase 11px letter-spaced headers; 13px cells, nowrap+ellipsis; row hover `rgba(255,255,255,.03)`; accent-colored points column; 🏆 appended to rank 1 via CSS `.rank-1:after`.
- **Status messages / info boxes:** tinted `rgba(color,.1)` background + `rgba(color,.3)` border + colored text — same pattern for success/error/warning/info, challenge banners, analytics info.
- **Section headings:** `h2` with icon in accent color and one `<span>` word accent-colored ("Log Your **Activity**", "Current **Ranking**").
- **Nav bars:** fixed/top, `rgba(15,15,35,.95)` + `backdrop-filter:blur(20px)`, bottom border; landing page has logo + underline-on-hover nav links (gradient underline grows from 0 to 100% width) + hamburger below 768px.
- **Typography scale (landing):** h1 3.5rem → 2.5 (≤1024) → 2 (≤768) → 1.75 (≤480); body `line-height:1.6`; secondary text `--text-secondary`.
- **Animations:** `float` (3s gentle Y bob, hero cards), `fadeInUp` 0.6s entrances, `spin` for loaders; gradient text via `background-clip:text`.
- **Responsive rules:** mobile-first cards, desktop grid at ≥992px, nav collapse at ≤768px, container `max-width:1200px` with `--spacing-lg` gutters.
- **Toasts** (`navigation.js showToast`): fixed top-right, slide-in from right, auto-dismiss 3 s, colored by type.

### 4.4 Landing page structure (`public/index.html` + `pages.css`)

Hero (headline with gradient-text word, description, primary/secondary CTAs, live stat counters, floating preview cards) → "How It Works" 3 numbered step-cards → Featured Challenges with filter pills and three category groups (Active / Coming Soon / Recently Completed) rendered from the JS registry → Community Stats card grid (stat number + icon + growth badge) → CTA band → 4-column footer. Challenge cards show status badge, icon + title, description, participants/duration/difficulty rows, date, and a status-dependent action button (Join / Notify Me / View Results).

## 5. CI / deploy setup

There are **no GitHub Actions** — no `.github/` directory, no tests, no linters. CI/CD is Netlify auto-deploy on push, configured entirely by `netlify.toml`:

```toml
[build]
  functions = "netlify/functions"
  publish   = "public"
[build.environment]
  NODE_VERSION = "18"
[[plugins]]
  package = "@netlify/plugin-functions-install-core"   # installs function deps
[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200                                          # SPA-style fallback
```

- Function deps: only `firebase-admin ^11.8.0` (`netlify/functions/package.json`).
- Required Netlify env vars: `FIREBASE_SERVICE_ACCOUNT` (full service-account JSON), `RECAPTCHA_SECRET_KEY` (legacy, only `addRun` uses it).
- All functions share the same skeleton: CORS headers (`*`), OPTIONS preflight handling, method guard, try/catch with 500 + `console.error`.
- ⚠️ The `/*` → `/index.html` redirect is why challenge pages must be real directories with `index.html` (they're matched before the fallback). The hub should keep pretty URLs `/challenge/<slug>/`.

## 6. Conventions & lessons for the challenge hub

**Carry over:**
1. Dark, card-based, accent-gradient visual language with per-challenge theme token overrides (§4.2) — this IS the product's identity.
2. Hybrid scoring vocabulary: zone minutes × multipliers, flat-point activity types with rate limits, and a ratio-based bonus that rewards healthy training (80/20).
3. Challenge lifecycle: `upcoming` (cyan banner, form locked) → `active` (form open) → `ended` (red completed banner, form locked, ranking preserved as archive). Old challenges stay browsable forever.
4. Small friendly roster (first-name select), honeypot instead of auth friction, emoji-flavored bilingual copy.
5. One fetch → many pure renderers, with a short-lived cache (§3.5).
6. Firestore one-collection-per-challenge with the §3.3 document shape.

**Fix in the hub (known debt):**
1. Challenge registry is hardcoded in `navigation.js` (and contains a date typo `endDate:'2025-6-30'` for SummerFit) — the hub should have a real challenge config/data source driving both listing and challenge pages.
2. Every challenge page duplicates ~900 lines of inline CSS/JS — extract shared components; theme via tokens only.
3. Endpoints/collections were repurposed between challenges (§2 gotcha) — parametrize by challenge slug.
4. Challenge open/closed state is enforced only in the UI (a DOM script disabling inputs); the closed backend still accepts writes — the hub should enforce start/end dates server-side.
5. The 80/20 bonus is computed in the browser at render time — move scoring/bonus logic server-side so ranking is canonical.
6. Landing page has non-functional Login/Sign Up/user-menu chrome and estimated stats (`participants × 12.5` activities) — replace with real data or drop.

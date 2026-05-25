@AGENTS.md

# degeneratefuckface.com — project notes

Companion to [deadplug.digital](https://deadplug.digital). Self-hosted multimedia drop-zone + coding-feats display case + Discord-integrated cult. One Dell R630, zero cloud bills.

The codename across systemd / DB / package.json is **`degenff`**. The public name is **degeneratefuckface.com**.

## What this site is (in one paragraph)

Three things at once on one tent: (1) **artist submissions** in any medium (image / audio / video / text / code / link / mixed), (2) **coding feats** — long-form case-study writeups, (3) a **Discord-integrated community spine** that bleeds back into every page. No algorithm: a queue, a person, a Discord channel. Sign in once with Discord; site roles are derived from Discord roles every login.

## Stack

| Layer | Choice |
|---|---|
| Edge | Cloudflare Tunnel (outbound-only from the box; no port-forward) |
| App | **Next.js 16** + App Router + Turbopack + RSC + server actions |
| Styling | **Vanilla CSS, no Tailwind.** All in `src/app/globals.css` |
| Language | TypeScript 5.9, React 19.2 |
| DB | Postgres 18, `pg` driver, Drizzle ORM 0.45 |
| Auth | Auth.js v5 (next-auth beta) with `@auth/drizzle-adapter`, Discord OAuth2 only |
| Uploads | local FS at `/var/lib/degenff/uploads/<hash[:2]>/<hash>.<ext>`, served via a route handler |
| Image processing | `sharp` (EXIF strip + re-encode) |
| MIME sniff | `file-type` (magic bytes; don't trust browser) |
| Markdown | `marked` → `isomorphic-dompurify` with explicit allowlist |
| Validation | `zod` 4 |
| Bot | `discord.js` v14, separate Node process via `tsx` |
| Hosting | Dell R630, Ubuntu, systemd (web + bot + cloudflared) |

### ⚠ Next.js 16 quirks (load-bearing — do NOT regress)

The repo runs **Next 16**, which is not the Next.js most training data describes. The AGENTS.md import at the very top of this file is intentional. Concretely:

- **`middleware` is renamed to `proxy`.** The file is `src/proxy.ts`. Use the `auth()` wrapper from Auth.js v5 and export a `config.matcher`.
- **Server actions** size cap is set explicitly: `experimental.serverActions.bodySizeLimit: "64mb"` in `next.config.ts` (artist submissions can be heavy).
- **`next/image`** requires explicit allow-lists in v16: `localPatterns: [{ pathname: "/uploads/**" }]` plus Discord CDN remotePatterns.
- **Behind a Cloudflare Tunnel** the app sees plain HTTP; rely on `X-Forwarded-*`, and Auth.js needs `trustHost: true`.
- Before adding a new Next API or convention, **read the relevant doc in `node_modules/next/dist/docs/`** to confirm shape. Heed deprecation notices.

## Folder structure

```
src/
  app/
    layout.tsx              # font wiring (Anton + Playfair Black Italic + IBM Plex Mono), global ambient layers, metadata, Nav/Footer/TeethRain/Heartbeat
    page.tsx                # homepage — hero with cycling-glitch headline, PrizeWheel, two bulb marquees, four "department" tiles, fake testimonials, manifesto with scratch-reveal, "from the Discord just now" placeholder
    globals.css             # the entire visual language. Single source of truth.
    about/page.tsx          # manifesto
    submissions/
      page.tsx               # public gallery (approved-only, filterable by medium)
      [id]/page.tsx          # submission detail
    submit/
      page.tsx               # signed-in gate; renders SubmitForm
      SubmitForm.tsx         # client form (useActionState)
    feats/
      page.tsx               # public list of approved feats
      [slug]/page.tsx        # feat detail (renders sanitized body_html via dangerouslySetInnerHTML)
      new/
        page.tsx             # signed-in gate; renders NewFeatForm
        NewFeatForm.tsx      # client form with client-side slugify-as-you-type
    actions/
      submit.ts              # server action for artist submissions
      feat.ts                # server action for feat submissions
    mod/page.tsx             # mod queue (gated by proxy.ts → mod/admin only)
    discord/page.tsx         # /discord landing — embed widget + invite + stats
    uploads/[...path]/route.ts  # streams /var/lib/degenff/uploads files
    api/auth/[...nextauth]/route.ts  # Auth.js handlers
  components/                # hand-written presentation primitives:
    Nav.tsx, Footer.tsx
    BulbMarquee.tsx          # carnival-bulb infinite scroller
    Glitch.tsx               # RGB chromatic aberration headline with cycling alt-text
    PrizeWheel.tsx           # CSS conic-gradient wheel, slow + cursed
    PrizeStamp.tsx           # rotated/colored "stamp" badges (gold/fuchsia/cyan/banned/evidence)
    Tile.tsx                 # four-department tile (skewed, off-axis hover lift)
    TeethRain.tsx            # falling teeth ambient layer (some bleed)
    Heartbeat.tsx            # corner ECG monitor
    Scratch.tsx              # hover-to-reveal redacted text
    SeenOn.tsx               # fake testimonials grid
    RevealOnView.tsx         # IntersectionObserver fade+red-flash on scroll
  db/
    index.ts                 # lazy pg pool + drizzle instance (re-exports schema as `schema`)
    schema.ts                # all tables, enums, relations, inferred types
    migrations/              # checked-in Drizzle migrations (0000, 0001, 0002 + meta/)
  discord/
    bot.ts                   # entrypoint for `tsx src/discord/bot.ts` (systemd unit)
    handlers.ts              # button routes: sub:approve|feature|reject|withdraw|unfeature, feat:approve|feature|reject|withdraw; guildMemberUpdate role sync
    embeds.ts                # embed + button-row builders for mod-queue + showcase
    notify.ts                # REST pipeline used by server actions to post new submissions/feats to mod-queue
  lib/
    markdown.ts              # marked → DOMPurify with hooks; slugify + isValidSlug
    uploads.ts               # multipart File → magic-byte sniff → size cap → sharp re-encode → sha256 → /var/lib/degenff/uploads/<hash[:2]>/<hash>.<ext>
    validation.ts            # Zod schemas: SubmitSchema, FeatSchema; parseTagsInput
    discord-widget.ts        # fetches the public widget JSON
    discord-sync.ts          # called from Auth.js signIn event: pulls guild member, maps roles, upserts users row
  auth.ts                    # Auth.js v5 wiring (Discord provider, Drizzle adapter, role hydration on session)
  proxy.ts                   # Next 16 middleware-equivalent: gates /mod (mod|admin) and /submit (signed-in)
ops/
  cloudflared.config.yml     # tunnel config template (UUID placeholder)
  degenff-web.service        # systemd unit for `next start`
  degenff-bot.service        # systemd unit for `tsx src/discord/bot.ts`
  deploy.sh                  # build + restart for ongoing redeploys
  env.example                # template for /etc/degenff/env (root:deadplug, 0640)
brand/                       # SVG sources: server-icon, bot-avatar, server-banner, server-invite-splash
public/
  mark.svg                   # favicon
  brand/                     # PNGs rasterized from brand/*.svg at Discord spec sizes
specs/
  feats_submission_design.md # design doc incl. fullstack-guardian security checklist
PLAN.md                      # original build plan (some details now superseded by reality)
README.md                    # public-facing readme (manifesto voice)
LICENSE                      # MIT
drizzle.config.ts            # Drizzle Kit config
next.config.ts               # see "Next 16 quirks" above
eslint.config.mjs
tsconfig.json
```

## Routes / pages

| Route | What's there | Auth |
|---|---|---|
| `/` | Hero, glitch headline, prize wheel, marquees, four-dept tiles, fake testimonials, manifesto, "from the Discord just now" | Public |
| `/submissions` | Approved gallery, filterable by medium, NSFW veil on thumb | Public |
| `/submissions/[id]` | Single submission detail | Public (approved only to non-owners) |
| `/submit` | Multipart upload form (artist submissions) | Signed-in (gated in `proxy.ts`) |
| `/feats` | Approved coding-feat list | Public |
| `/feats/[slug]` | Long-form writeup, renders sanitized HTML | Public for approved; owner/mods see pending |
| `/feats/new` | Feat submission form | Signed-in (gated in route, not proxy) |
| `/mod` | Mod queue | mod/admin only (gated in `proxy.ts`) |
| `/discord` | Landing page with widget + invite + stats | Public |
| `/about` | Manifesto | Public |
| `/uploads/[...path]` | Streams user uploads from `/var/lib/degenff/uploads/` | Public |
| `/api/auth/*` | Auth.js handlers | — |

## Data model (Drizzle, `src/db/schema.ts`)

- `users` — id (nanoid 21), discordId UNIQUE (nullable), handle, name, image, email, role enum (`visitor|contributor|mod|admin`, default `contributor`), banned, discordRoles jsonb, createdAt, lastSeenAt
- `accounts` / `sessions` / `verificationTokens` — Auth.js v5 Drizzle adapter shape; **snake_case column names matter** (`refresh_token`, `access_token`, etc.) — the adapter expects them verbatim
- `submissions` — medium enum, title/body/bodyHtml/linkUrl, files jsonb array `{path,mime,bytes,width?,height?,durationMs?}`, tags jsonb, nsfw, status enum (`pending|approved|rejected|withdrawn`), featured, submitterIp/Ua, discordMessageId/ChannelId, decidedAt/By, rejectionReason
- `feats` — userId, **slug UNIQUE**, title, summary, bodyMd + bodyHtml, heroImagePath, repoUrl, demoUrl, tags, status, publishedAt
- `modActions` — audit trail; FKs to either submissionId or featId; `source` is `'site' | 'discord'`
- `discordActivity` — cache of recent messages for the homepage pulse
- `rateLimit` — generic counter table keyed by string

IDs are nanoid (21 chars for users / mod_actions, 14 for content).

## Discord integration

- **Auth.** Discord OAuth scopes: `identify email guilds guilds.members.read`. We don't gate by guild membership — the bot syncs roles asynchronously via `syncDiscordMember` in the Auth.js `signIn` event.
- **Role mapping.** `DISCORD_ADMIN_ROLE_ID` → `users.role='admin'`. `DISCORD_MOD_ROLE_ID` → `users.role='mod'`. Everyone else `contributor`. Lose the Discord role, lose access at next login or `guildMemberUpdate` event.
- **Mod queue.** New submissions → bot posts an embed to `DISCORD_MOD_QUEUE_CHANNEL_ID` with buttons. Custom IDs follow `sub:<action>:<submissionId>` and `feat:<action>:<featId>`. Actions: `approve | feature | reject | withdraw | unfeature` (subs); `approve | feature | reject | withdraw` (feats).
- **Showcase mirror.** On approve/feature, bot mirrors to `DISCORD_SHOWCASE_CHANNEL_ID` (subs) or `DISCORD_FEATS_CHANNEL_ID` (feats), with persistent Withdraw / Unfeature controls.
- **Defense in depth on every button.** `requireMod()` re-reads the clicking user from the DB and asserts role on every interaction — does not trust prior state.
- **Bot process.** Separate systemd unit (`degenff-bot.service`). Intents enabled: Guilds, GuildMessages, GuildMembers, MessageContent, GuildPresences.

## Upload pipeline (`src/lib/uploads.ts`) — security-shaped

1. Read full bytes into Buffer.
2. **Magic-byte MIME sniff** via `file-type`. Browser-supplied `file.type` is ignored.
3. Check sniffed MIME against `ALLOWED` set (image jpg/png/webp/gif/avif; audio mp3/wav/ogg/flac/aac; video mp4/webm/quicktime). Reject otherwise.
4. Per-kind size cap (image 24MB, audio 48MB, video 60MB).
5. For non-GIF images: `sharp.rotate().<encoder>().toBuffer()` — strips EXIF, defangs polyglots, normalizes orientation.
6. **Content-addressable.** SHA-256 of processed bytes → `<hash[:2]>/<hash>.<ext>`. Dedupe on collision (skip write if file already exists).
7. Stored under `/var/lib/degenff/uploads/`, mode `0644`, dirs `0755`. Served via `/uploads/[...path]` route handler.

## Markdown pipeline (`src/lib/markdown.ts`)

`marked` (gfm: true, breaks: false) → `DOMPurify.sanitize` with explicit `ALLOWED_TAGS` + `ALLOWED_ATTR`. Hooks:
- `uponSanitizeAttribute`: only accept `href`/`src` that match `/^(?:https?:\/\/|\/uploads\/)/i`.
- `afterSanitizeAttributes`: external `<a>` get `rel="noopener nofollow ugc"` + `target="_blank"`; `<img>` get `loading="lazy"` + `decoding="async"`.
- Explicit `FORBID_TAGS`: script, iframe, object, embed, form, input, link, meta, style.
- Explicit `FORBID_ATTR`: style, onerror, onload, onclick, onmouseover, onfocus, formaction.

Storage: raw markdown in `feats.body_md` (re-editable), sanitized HTML in `feats.body_html` (rendered via `dangerouslySetInnerHTML` — safe **only** because it's already sanitized at write time).

`slugify()` strips diacritics, lowercases, hyphenates, caps at 96. `isValidSlug` rejects reserved slugs (`new`, `edit`, `submit`, `admin`, `api`).

## Visual language

This is the part to handle with care — the aesthetic is the product.

### Voice
- "Operator-cult industrial." Dry, deadpan, second-person.
- `// section` prefixes on eyebrows. Section titles use slam-and-menace cadence ("X. *Y.*\nZ.").
- Reads like an evidence locker that's also a tabloid.
- Glyph vocabulary: ◆ ◇ ◈ ⬡ ⬢ ◉ ↗

### Fonts (wired in `layout.tsx` via `next/font/google` as CSS variables)
- `--font-anton` — **Anton** 400. Ultra-condensed brutal sans for slam headlines. Variable `--slam`.
- `--font-playfair` — **Playfair Display** 900 italic. The menace serif counterpoint. Variable `--menace`.
- `--font-plex-mono` — **IBM Plex Mono** 400/700. Operator-cult bones. Variable `--mono`.
- `--sans` is system UI (used sparingly for body copy).

Three faces on purpose, colliding.

### Palette (CSS custom properties in `:root`)
- **Spine:** `--red` `#cc0000`, `--red-bright` `#ff2222`, `--red-dim` `#880000`, `--red-deeper` `#4a0000`, `--red-blood` `#6b0000`. Plus `--red-glow`, `--red-soft`, `--red-ghost`.
- **Backgrounds:** `--bg` `#030303`, `--surface` `#0a0908`, `--surface-2` `#100e0d`, `--surface-3` `#181513`. "Pushed darker still."
- **Borders:** `--border` `#1c0000`, `--border-mid` `#2b0000`, `--border-strong` `#4a0000`.
- **Text:** `--text` `#e6e3df`, `--text-dim` `#4d4945`, `--text-mid` `#8a857f`, `--text-bright` `#ffffff`, `--text-rust` `#b87a7a`.
- **Warning accents (used sparingly, like warning lights):** `--hazard` (yellow), `--fuchsia` `#ff2e7c`, `--cyan` `#00f5d4`, `--chartreuse` `#c4ff00`. Each has a matching `*-glow` and most have a `*-bright`.
- **Foil:** `--foil-gold` is a conic-gradient applied to gold stamps.

### Layout primitives
- `--grid` 48px (used for the ambient grid drift bg)
- `--gutter` `clamp(1rem, 3vw, 2.25rem)`
- `--maxw` 1500px; `--maxw-text` 68ch
- `--t-fast` 120ms, `--t-mid` 280ms, `--t-slow` 600ms, `--ease` cubic-bezier(0.2, 0.6, 0.2, 1)
- `cursor: crosshair` on `body`, `a`, `button`, `.tile`, `.btn` — text inputs reset to `text`
- Selection: red on white

### Ambient layers (fixed, pointer-events: none, z-index 0–1, applied in `layout.tsx`)
1. `.bloom` — radial-gradient soft glows (fuchsia/cyan/red), `bloomBreathe` 9s scale-pulse
2. `.grid-bg` — 48px red-ghost grid, `gridDrift` 45s linear
3. `.grime` — SVG turbulence noise, multiply blend, 0.5 opacity
4. `<TeethRain count={22} />` — falling tooth SVGs, some "bleed" (red drip)
5. `.scanlines` — 2px multiply scanlines
6. `.page` — z-index 2, holds Nav/main/Footer
7. `<Heartbeat />` — fixed bottom-right ECG monitor (z-index 60)

### Set pieces (single source of truth: `globals.css`)
- `.bulb-marquee` — carnival bulbs top + bottom with `bulbChase` + occasional `bulbSagging` "about to die" flicker. Pauses on hover.
- `.slam-stack` — three-line headline cadence: slam / menace italic / slam-with-skew + tiny mono.
- `.glitch` — `::before` cyan + `::after` fuchsia with mix-blend-mode screen, animated `clip-path` for RGB split. `.glitch-cycle > .alt` flashes alternate text.
- `.prize-wheel` — conic-gradient 8-wedge wheel, 96s slow spin, animated iris pupil, pointer triangle.
- `.tile` — black border, double box-shadow stack (black + red layered offset), striped header bar, rotation classes (`skew-l`, `skew-r`, `skew-deep-l`, `skew-deep-r`), optional rotated stamp via `data-stamp` attribute, hover lifts and intensifies.
- `.stamp` — rotated badges in red / gold-foil / fuchsia / cyan / banned (black on red) / evidence (white on black, mono).
- `.btn` — red slab with stacked black + red-deeper offset shadows; `.btn.ghost` inverts to black with red border. Pseudo-after appends ` »` in italic menace.
- `.scratch` — hover-to-reveal hatched-pattern overlay clipping inset.
- `.heartbeat` — corner ECG monitor with an SVG polyline scrolling at 1.2s, plus pulse text.
- `.gallery-tile` — tile variant with bleed-to-edge thumbnail (4:3), NSFW veil that blurs the thumb and lifts on hover.
- `.feat-body` — markdown render styles: slam h1–h4, menace blockquote with red-3px border, cyan inline code on dark surface, code blocks with red-deeper shadow.

### Motion
- `prefers-reduced-motion: reduce` kills the long-running ambient loops (grid drift, bulbs, marquee, wheel, bloom, ECG) and clamps transitions to 0.01ms — but the file keeps fade/reveal on for accessibility. Anything new should respect this block.
- `.reveal-on-view` is an IntersectionObserver client component that toggles `.is-in` for a 0.6s fade-up + 0.9s red-flash inset box-shadow.

## Conventions / preferences

- **No Tailwind.** Vanilla CSS only. Add new classes to `globals.css` near the related cluster, follow the `/* ─── name ─── */` divider style.
- **Server-first.** Pages are RSC unless they need client state; gates use the `proxy.ts` matcher first and an `auth()` check inside the page as a belt-and-braces layer.
- **Server actions** for mutations (`src/app/actions/*`). Validate with Zod, never trust form data.
- **No comments unless the WHY is non-obvious.** The existing comments call out things like "Auth.js adapter expects snake_case verbatim" or "GIF stays GIF because sharp would freeze it" — that's the bar.
- **Secrets** live in `/etc/degenff/env` (owned `root:deadplug`, mode `0640`), loaded by systemd `EnvironmentFile=`. Never commit values; `ops/env.example` is the template.
- **Migrations** are Drizzle-Kit generated and checked in under `src/db/migrations/`. Run via `npm run db:migrate`. Don't `db:push` against prod.
- **Uploads always go through `processUpload`.** Don't bypass to write user bytes directly.
- **Markdown always goes through `renderMarkdown`.** Don't render user-supplied markdown any other way.
- **Bot mutations always go through `requireMod()`.** Don't trust prior interaction context.

## Running it

```
npm run dev           # Next dev (Turbopack)
npm run build         # production build
npm run start         # production server
npm run bot           # one-shot bot process
npm run bot:watch     # bot with tsx watch
npm run db:generate   # Drizzle migration from schema diff
npm run db:migrate    # apply pending migrations
npm run db:studio     # Drizzle Studio
npm run lint          # eslint
```

`ops/deploy.sh` does build + systemd restart for ongoing redeploys. The `cert.pem` at the repo root is the Cloudflare Tunnel origin cert (gitignored in spirit; safe to keep local).

## Out of scope (Phase 1, per `PLAN.md`)

- Native iOS / Android apps
- Federation / ActivityPub
- E2E messaging (deadplug.digital handles that)
- Live streaming infrastructure

# degeneratefuckface.com

> *A cathedral for bad ideas.*
>
> Hand-built on a Dell R630 in someone's house. Moderated by humans. Not affiliated with anything that wants you well-adjusted.

The companion to [deadplug.digital](https://deadplug.digital). Same operator-cult industrial DNA, same self-hosted edge-to-edge posture, different tent.

---

## What this is

A multimedia drop-zone, a coding-feats display case, and a Discord-integrated cult of weirdos. The site holds three things at once: artist submissions in any medium, long-form coding showcases, and a community spine that bleeds back into every page in real time. You sign in once with Discord and the rooms remember you.

There is no algorithm. There is a queue, a person, and a Discord channel that smells like menthol and ozone.

## The house rules

The internet sorted itself into a feed and called it a culture. We disagree. Submissions live or die on whether they're interesting, not whether they're engaging.

Banned at the door: bigotry, doxxing, illegal content, generative slop you didn't edit, CSAM, and anything that wastes a moderator's time. Past that line: weirder is better.

If your thing makes someone slightly uncomfortable in a specific way, congratulations, you're in the right room.

## The stack

```
       public internet
              │
              ▼
   Cloudflare edge (TLS, WAF, anycast)
              │
              │ outbound-only tunnel
              ▼
   cloudflared on the box  (systemd)
              │ → 127.0.0.1:3000
              ▼
   Next.js 16 / App Router / RSC / server actions
              │
              ▼                           ◀── discord.js bot (separate Node
   Postgres 18 (Drizzle ORM)                  process, systemd unit; gateway
              ▲                              + REST notify path)
              │                              │
              └──────────────────────────────┴── Discord guild
```

- **Edge.** Cloudflare Tunnel. No port-forwarding, no exposed residential IP, free TLS termination at the edge.
- **App.** Next.js 16, App Router, Turbopack, server actions. Vanilla CSS, no Tailwind. Three faces colliding on purpose: **Anton** + **Playfair Display Black Italic** + **IBM Plex Mono**.
- **Database.** Postgres 18 with Drizzle ORM. Migrations checked into `src/db/migrations/`.
- **Auth.** Discord OAuth2 via Auth.js v5. Roles in the Discord server map directly to roles on the site. Lose the role, lose access — at next sign-in. No second source of truth.
- **Bot.** `discord.js` v14 in its own process. Approve / Feature / Reject / Withdraw / Unfeature buttons attached to every mod-queue and showcase message; the bot re-checks the clicker's role on every interaction before mutating anything.
- **Uploads.** Files written to `/var/lib/degenff/uploads/<hash[:2]>/<hash>.<ext>`. Magic-byte MIME sniff (don't trust the browser), `sharp` re-encode for images (strips EXIF + defangs polyglots), content-addressable hash, dedupe on collision.
- **Markdown** (for feat writeups): `marked` → `DOMPurify` with an explicit allowlist. `script` / `iframe` / `object` / `embed` / `form` / inline styles all stripped. External `<a>` get `rel="noopener nofollow ugc"` + `target="_blank"`.
- **Hosting.** One Dell R630. Zero cloud bills. The cloud is just someone else's computer; this one is ours.

## What's in this repo

```
src/app/        — Next.js routes (App Router). Includes /submissions, /feats,
                  /submit, /mod, /discord, and the per-route server actions.
src/components/ — Hand-written presentation primitives. Tile, BulbMarquee,
                  Glitch (RGB chromatic aberration with cycling alt-text),
                  PrizeWheel (CSS conic-gradient), PrizeStamp, TeethRain,
                  Heartbeat (corner ECG monitor), Scratch (hover-to-reveal),
                  SeenOn (fake testimonials), RevealOnView.
src/db/         — Drizzle schema + migrations + lazy connection.
src/discord/    — Bot process, REST notify pipeline, embed builders, button
                  routes for sub:approve|feature|reject|withdraw|unfeature
                  and feat:approve|feature|reject|withdraw.
src/lib/        — Markdown sanitizer, upload pipeline, Zod validation,
                  Discord widget fetcher, role-sync.
src/auth.ts     — Auth.js v5 wiring.
src/proxy.ts    — Next 16's renamed middleware. Gates /mod and /submit.
ops/            — systemd unit files, cloudflared config template, deploy
                  script, env example.
brand/          — SVG sources for the server icon, bot avatar, server banner,
                  and invite splash. Rasterized PNGs at Discord spec sizes
                  live in public/brand/.
specs/          — Design docs. The feats submission spec includes the
                  fullstack-guardian security checklist.
public/         — Static assets served at the root.
```

## Running it (more or less)

This isn't a "deploy in three clicks" project. It's our box, our edges, our way. But for the curious:

**Prerequisites**

- Ubuntu (or any Linux), `systemd`
- Node 22+, Postgres 18+
- `cloudflared`, `librsvg2-bin` (for brand rasterization), `ImageMagick`, `ffmpeg`

**Sketch**

1. `cp ops/env.example /etc/degenff/env`, fill in secrets, `chmod 0640`, `chown root:deadplug`.
2. `psql -c "CREATE ROLE degenff LOGIN PASSWORD '...';"` and `createdb -O degenff degenff`.
3. `npm install`
4. `set -a; . /etc/degenff/env; set +a; npx drizzle-kit migrate`
5. `cloudflared tunnel login` (browser flow, drops `~/.cloudflared/cert.pem`)
6. `cloudflared tunnel create degenff` → grab the UUID, drop it into `ops/cloudflared.config.yml`.
7. `cloudflared tunnel route dns degenff your.domain.com` (and `www.`).
8. `sudo cloudflared service install` — registers the systemd unit.
9. `npm run build` then install + enable the `degenff-web` and `degenff-bot` systemd units from `ops/`.
10. On the Discord side: create the application, add the redirect URI `https://your.domain.com/api/auth/callback/discord`, enable the three privileged intents, invite the bot to your guild with **Send Messages / Manage Messages / Embed Links / Attach Files / Read Message History / View Channels**.

The `bash ops/deploy.sh` script does the build + service restart for ongoing redeploys.

## What you'll need

| Thing | Where you get it |
|---|---|
| Discord application | https://discord.com/developers/applications |
| Cloudflare account + a domain on it | https://dash.cloudflare.com |
| A Linux box you control | the back of your closet, ideally |

## License

Every right deserved, none reserved. Fork it. Run a worse version. We don't care. If you ship something better, tell us in the Discord.

The font files in `node_modules/` are licensed by their respective owners — none of them is ours.

---

> *"I lost something here and I cannot tell anyone what."* — A Reader, Probably
>
> *"Possession of this page is illegal in fourteen nations."* — A Lawyer We Don't Know
>
> *"I will not be returning. I have already returned."* — Former Visitor, current visitor

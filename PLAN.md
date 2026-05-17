# degeneratefuckface.com — Build Plan

**Box:** degenff (Dell R630, Ubuntu 26.04, 32C/61GiB/~7TB RAID)
**Sibling site:** deadplug.digital — visual language, voice, and ethos are inherited from it
**Aesthetic shorthand:** operator-cult industrial. Oxblood on near-black, scanlines, gridDrift, glyph vocabulary (◆ ◇ ◈ ⬡ ⬢ ◉ ↗), dry-deadpan voice with `// section` prefixes.

## Pitch

Eclectic platform for: (a) **artist submissions** (any medium), (b) **showcases of coding feats**, (c) **a Discord-integrated community layer** that bleeds into every page. Multimedia explosion, weird-coded. Self-hosted, edge-to-edge.

## Architecture

```
public internet
      │
      ▼
 Cloudflare edge (TLS, WAF, anycast)
      │ tunneled (outbound only)
      ▼
 cloudflared (R630)
      │ http://127.0.0.1:443 → 127.0.0.1:8080
      ▼
 Caddy (local proxy, vhost router)
      │
      ├─→ Next.js app  :3000  (degenff-web.service)
      ├─→ static uploads under /var/lib/degenff/uploads
      └─→ /api/discord-webhook → bot
                                    │
                          discord.js bot :n/a
                          (degenff-bot.service)
                                    │
                                    ▼
                                 Discord guild
 Postgres 16 (unix socket) ◄────── both app + bot
```

## Stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Edge | Cloudflare Tunnel | residential NAT, hide home IP, free TLS+DDoS |
| Local proxy | Caddy | clean config, h2/h3, internal certs for LAN admin |
| App | Next.js 15 + App Router (TS) | full-stack, RSC, server actions |
| Styling | vanilla CSS (no Tailwind) | matches sibling site, hand-crafted feel |
| DB | Postgres 16 | mature, free, lives on local disk |
| ORM | Drizzle | typed but SQL-shaped |
| Auth | Discord OAuth2 via Auth.js | Discord is the community spine |
| Storage | local FS `/var/lib/degenff/uploads/<hash[0:2]>/<hash>` | 7 TB on the box |
| Bot | discord.js | mirrors submissions → mod queue → showcase |
| Process | systemd × 4 | web / bot / cloudflared / caddy |
| Firewall | UFW | allow 22 from LAN only; tunnel is outbound |

## Site map

- `/` — hero (large red headline), live Discord pulse, marquee, manifesto, recent approved submissions
- `/submissions` — gallery of approved works (filter: image / audio / video / text / code / link)
- `/submit` — multi-media upload form
- `/feats` — long-form code feats (case-study format)
- `/discord` — embed widget + channel deep-links + member status
- `/mod` — moderation queue (Discord OAuth, Mod role gate)
- `/about` — manifesto, philosophy

## Data model (initial)

```
users(id, discord_id UNIQUE, handle, avatar_url, created_at, roles[])
submissions(id, user_id, medium ENUM, title, body, file_paths[], link_url,
            status ENUM('pending','approved','rejected'), nsfw BOOL,
            created_at, decided_at, decided_by, discord_message_id)
feats(id, user_id, slug UNIQUE, title, body_md, tags[], status,
      hero_image, repo_url, demo_url, created_at)
mod_actions(id, submission_id, mod_user_id, action ENUM, reason, created_at)
sessions(token, user_id, expires_at)   # Auth.js
```

## Discord ↔ Site integration

- **Submit** → row inserted as `pending` → bot posts embed to `#mod-queue` with `[Approve] [Reject] [Reject + Reason]` buttons.
- **Approve** → status flips to `approved` → bot edits queue message + posts to `#showcase`.
- **Discord role sync** — `Admin` / `Mod` Discord roles grant matching site permissions on next login.
- **Live pulse on `/`** — bot caches recent activity (online count, last public message excerpts) in Postgres → site reads cache.
- **Webhook ingest** — selected channels mirror messages into a site activity feed.

## Moderation defense-in-depth

- Pre-publication review (mod queue is the rule).
- MIME sniff on upload; whitelist of types per medium.
- ImageMagick re-encode for images (strips EXIF, kills polyglots).
- FFmpeg probe + re-mux for video/audio.
- Per-IP and per-account rate limits.
- Audit trail (`mod_actions`).
- NSFW flag at submit; gated `/submissions?nsfw=1` view.

## What I need from you

1. **Discord application** at https://discord.com/developers/applications:
   - Create app → grab **Client ID** + **Client Secret**.
   - Bot tab → reset token → grab **Bot Token**. Enable: `MESSAGE CONTENT INTENT`, `SERVER MEMBERS INTENT`, `PRESENCE INTENT`.
   - OAuth2 → add redirect: `https://degeneratefuckface.com/api/auth/callback/discord`.
   - Invite bot to a server you own with scopes `bot applications.commands` and permissions `Manage Messages`, `Send Messages`, `Read Message History`, `Embed Links`, `Attach Files`.
2. **One browser click** for `cloudflared login` when I prompt.

## Out of scope (Phase 1)

- Native iOS/Android apps
- Federation / ActivityPub
- E2E messaging (deadp0et already covers that on the sibling site)
- Live streaming infra

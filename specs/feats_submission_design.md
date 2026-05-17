# Feats Submission Flow — Technical Design

> Long-form coding showcases. Sibling of `/submit` (artist submissions) but
> shaped around writeups rather than uploads.

## Acceptance criteria

1. Signed-in user can `POST /feats/new` with: title (required), summary (≤320 chars), slug (auto-derived from title, editable, unique), body (markdown, ≤200 KB), hero image (optional, single, jpeg/png/webp/avif/gif), repo URL (optional, http(s)), demo URL (optional, http(s)), tags (≤12).
2. Row inserted with `status='pending'`, slug guaranteed unique (server appends `-2`, `-3`, … on collision).
3. Body is rendered to HTML server-side via `marked` and **sanitized via DOMPurify** before storage in `feats.body_html`. The raw markdown lives in `feats.body_md` for re-render on edit.
4. Bot posts an embed to `#mod-queue` with `feat:approve|feature|reject:<id>` button custom-IDs.
5. Bot interaction handlers in `src/discord/handlers.ts` update `feats.status` + `publishedAt`, mirror to `DISCORD_FEATS_CHANNEL_ID` on approval, write to `mod_actions`.
6. Public detail page at `/feats/[slug]` renders only `status='approved'` feats to non-owners/non-mods.
7. Submitter is redirected to `/feats/[slug]` after submit and can see their own pending feat (mods too).

## Three perspectives

### Frontend (`src/app/feats/new/page.tsx` + `NewFeatForm.tsx`)

- Server component reads session; if not signed in → 307 to signin with `callbackUrl=/feats/new`.
- Client form (`useActionState`) holds: medium-free; just the feat fields.
- Slug auto-derives client-side from title via `slugify` on each keystroke, but the user can edit it. Server still validates + dedupes.
- No client-side markdown preview in v1 — keeps the bundle lean and avoids running `marked` twice.
- Public list `/feats` already exists; only change is adding a "Submit a feat" CTA at top of the section.
- Detail page `/feats/[slug]` is server-rendered, looks up by slug, renders `body_html` via `dangerouslySetInnerHTML` **only** because that string is already sanitized.

### Backend (`src/app/actions/feat.ts`, `src/lib/markdown.ts`)

- `submitFeat(prev, formData)` server action:
  1. `auth()` — bail if no session.
  2. Zod-parse the scalar fields (`FeatSchema`).
  3. `processUpload(hero)` if a file is present; reject non-image MIMEs.
  4. Render `body_md` → `body_html` via `renderMarkdown()`.
  5. Slug uniqueness loop: try `slug`, `slug-2`, `slug-3`, … until insert succeeds (max 50 attempts). Use Postgres unique violation as the signal (cheap).
  6. Insert row, return `id` + `slug`.
  7. Best-effort `notifyNewFeat(featId)`.
  8. `redirect("/feats/" + slug)`.
- `renderMarkdown(md)`:
  - `marked.parse(md, { gfm: true, breaks: false, async: false })` → raw HTML
  - `DOMPurify.sanitize(html, ALLOWED_TAGS, ALLOWED_ATTRS, FORBID_TAGS)` → safe HTML
  - Returns the sanitized HTML string.

### Discord (bot + notify)

- `src/discord/notify.ts` gains `notifyNewFeat(id)` mirroring `notifyNewSubmission`. Different embed shape (no big image, repo + demo as fields).
- `src/discord/handlers.ts` gains `feat:approve|feature|reject:<id>` routes paralleling submission ones. Approve mirrors the embed to `DISCORD_FEATS_CHANNEL_ID` instead of showcase, sets `feats.publishedAt = now()`.

### Schema

No migration required — the `feats` table is already shaped. We add:
- A unique index `feats_slug_unique` is already present.
- We use the existing `mod_actions.feat_id` FK for the audit trail.

## Security checkpoint

| Concern | Mitigation |
|---|---|
| **Auth** (who can submit?) | `auth()` in the action; `/feats/new` and `submit` server action both gate. Unsigned redirected to signin. |
| **Authz** (who can approve?) | Mod buttons are in `#mod-queue`, a private channel; the bot also re-checks the clicking user's roles against `DISCORD_ADMIN_ROLE_ID` / `DISCORD_MOD_ROLE_ID` before mutating. |
| **XSS via markdown** | `marked` emits HTML; `DOMPurify.sanitize` with explicit `ALLOWED_TAGS` (no script, iframe, object, embed, form, input, link, meta, style) and explicit `ALLOWED_ATTR` (no `on*`, no `style`, only `href`/`title`/`alt`/`src` with url-allowlist). External `<a>` get `rel="noopener nofollow ugc"` and `target="_blank"` added post-sanitize. |
| **XSS via inline images** | DOMPurify hook strips `<img src="javascript:…">` and any non-http(s) scheme. `<img>` is allowed only with `src` matching `^https?://` or `^/uploads/`. |
| **SSRF on URL fields** | repo/demo URLs are stored, not fetched server-side. We never `fetch()` user-supplied URLs from the web process. |
| **Open redirect** | Not applicable — `redirect("/feats/" + slug)` after submit; slug is server-validated. |
| **Slug abuse / path traversal** | Slug enforced via Zod: `/^[a-z0-9](?:[a-z0-9-]{0,94}[a-z0-9])?$/`. Reserved slugs `["new", "edit", "submit", "admin"]` rejected. |
| **File upload abuse** | Reuses `processUpload` from `/submit` flow — magic-byte MIME sniff, sharp re-encode of images (strips EXIF, defangs polyglots), size cap (24 MB for hero image), content-addressable hash, mkdir mode 0755 / file mode 0644. |
| **SQL injection** | All queries via Drizzle parameterized; no string interpolation into SQL. |
| **CSRF** | Server actions are POST-only with Next.js built-in origin checking (Next 16 default). Auth.js's CSRF cookie covers the OAuth flow. |
| **Rate limiting** | Out of scope for v1. Mod queue + Discord visibility makes abuse expensive vs reward. `rate_limit` table is provisioned for v2. |
| **PII** | Only Discord ID + handle + display name + avatar URL are stored; email captured from OAuth (not surfaced on public pages). |
| **Banned users** | Out of scope for v1 (would belong in `submitFeat`'s auth check; pattern is the same as the submit action). |
| **Logging** | `mod_actions` row inserted on every approve/reject. Errors logged to journal. |

## Out of scope (v2+)

- Markdown live-preview (would require shipping `marked` to the client)
- Edit / update feat post-submission
- Code syntax highlighting (would require Shiki or highlight.js server-side)
- Inline images in markdown body (only hero image v1)
- Feat comments / threading
- View counts / analytics

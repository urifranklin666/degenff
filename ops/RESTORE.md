# // restore — getting the carnival back online

Disaster-recovery runbook for degeneratefuckface.com on the R630
(`deadplug.digital`, LAN `192.168.4.42`). Assumes your backups live on an
external drive on a Windows machine (e.g. `E:\dead serve\`).

What a full restore needs, in order of importance:

| What | Where it came from | Restores |
|---|---|---|
| `degenff-*.sql.zst` | `/var/lib/degenff/backups/` (nightly `ops/backup.sh`) | users, passkeys, sessions, feats, awards, séance, bureau, rooms — everything |
| `uploads/` tree | `/var/lib/degenff/uploads/` | feat hero images and other content-addressed files |
| `/etc/degenff/env` | the box | secrets: `DATABASE_URL`, `AUTH_URL`, tunnel + API keys |
| cloudflared credentials | `/etc/cloudflared/` (tunnel UUID `.json` + cert) | the public hostname |

No `env` copy in the backup? You'll rebuild it from `ops/env.example` —
regenerate any lost API keys, and note the tunnel can be recreated with
`cloudflared tunnel create` if its credentials file is gone.

## 1. Copy the backup from the Windows machine to the box

From PowerShell on the Windows machine (adjust the folder name to whatever
it actually is — spaces need the quotes):

```powershell
scp -r "E:\dead serve\*" deadplug@192.168.4.42:/home/deadplug/restore-staging/
```

Or from the box, pulling instead of pushing (if the Windows machine runs an
SSH server), or plug the drive into the R630 directly — NTFS mounts fine:

```bash
sudo mkdir -p /mnt/edrive && sudo mount -t ntfs-3g /dev/sdX1 /mnt/edrive
cp -r "/mnt/edrive/dead serve" /home/deadplug/restore-staging
```

## 2. If the box itself needs rebuilding (skip if it boots fine)

```bash
# Base deps
sudo apt install -y postgresql-18 zstd nodejs npm rsync
sudo -u postgres createuser deadplug && sudo -u postgres createdb -O deadplug degenff

# Code
git clone https://github.com/urifranklin666/degenff.git /home/deadplug/Degeneracy
cd /home/deadplug/Degeneracy && npm ci

# Secrets — restore your copy, or rebuild from the template
sudo mkdir -p /etc/degenff
sudo cp ops/env.example /etc/degenff/env   # then edit in the real values
sudo chown root:deadplug /etc/degenff/env && sudo chmod 0640 /etc/degenff/env

# Data dirs
sudo mkdir -p /var/lib/degenff/{uploads,backups}
sudo chown -R deadplug:deadplug /var/lib/degenff

# Units
sudo cp ops/degenff-*.service ops/degenff-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable degenff-web degenff-barker degenff-radio degenff-backup.timer
# degenff-bot stays disabled — the Discord is dead.

# Tunnel (needs /etc/cloudflared restored or a fresh `cloudflared tunnel create`)
sudo cp ops/cloudflared.config.yml /etc/cloudflared/config.yml   # fill in UUID
sudo systemctl enable --now cloudflared

# Build once before first start
bash ops/deploy.sh
```

## 3. Restore the database (and uploads)

`ops/restore.sh` is the inverse of `ops/backup.sh`. It stops the services,
drops the `public` schema, loads the dump, restores uploads if given,
restarts, and health-checks:

```bash
cd /home/deadplug/Degeneracy

# Pick the newest dump in the staging copy
ls -lt /home/deadplug/restore-staging/**/degenff-*.sql.zst | head

bash ops/restore.sh /home/deadplug/restore-staging/backups/degenff-2026-07-24-0400.sql.zst \
  --uploads /home/deadplug/restore-staging/uploads
```

It refuses files that don't look like a `pg_dump`, and asks for confirmation
before dropping anything (`--yes` skips the prompt for scripted use).

## 4. Verify

```bash
systemctl status degenff-web degenff-barker degenff-radio cloudflared
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
psql "$DATABASE_URL" -c 'SELECT count(*) FROM users;'
```

Then hit the public site: sign in at `/gate` with a passkey (they live in the
DB, so they survive the restore), check a feat page renders its hero image
(proves uploads), open `/rooms` (proves the barker + LISTEN/NOTIFY), and
`/radio` (proves the station process).

If the dump predates the newest migrations, finish with:

```bash
npm run db:migrate
```

## What is NOT in the nightly backup

`ops/backup.sh` only dumps Postgres. These live outside it — make sure your
`E:\` copy includes them, or accept the loss:

- `/var/lib/degenff/uploads/` — content-addressed, so a partial copy is fine;
  missing files just 404 on their feat pages.
- `/etc/degenff/env` — rebuild from `ops/env.example` if lost.
- `/etc/cloudflared/` — recreate the tunnel if lost; update DNS via
  `cloudflared tunnel route dns`.
- Radio music crate (`RADIO_MUSIC_DIR`) and Piper/whisper voice models —
  re-copy / re-run `ops/voice-setup.sh`.

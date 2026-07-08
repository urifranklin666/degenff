#!/usr/bin/env bash
# degenff voice deps: install the host binaries + models the Barker needs to
# hear and speak in voice chat — whisper.cpp (STT), Piper (TTS), ffmpeg.
# Self-hosted, no cloud. Run once on the box, then fill the matching paths into
# /etc/degenff/env (see ops/env.example) and restart degenff-bot.
#
# Idempotent: skips anything already present. Override install/model dirs with
# VOICE_PREFIX (default /opt/degenff-voice) and model sizes with WHISPER_GGML /
# PIPER_VOICE_NAME.
set -euo pipefail

PREFIX="${VOICE_PREFIX:-/opt/degenff-voice}"
WHISPER_GGML="${WHISPER_GGML:-ggml-base.en}"      # tiny.en | base.en | small.en
PIPER_VOICE_NAME="${PIPER_VOICE_NAME:-en_US-lessac-medium}"
WHISPER_DIR="$PREFIX/whisper.cpp"
PIPER_DIR="$PREFIX/piper"
VOICES_DIR="$PREFIX/voices"

# Normalize the model name regardless of how WHISPER_GGML was written
# (base.en / ggml-base.en / ggml-base.en.bin all collapse here). The downloader
# always writes models/ggml-<name>.bin, so we build the canonical path to match.
WHISPER_NAME="${WHISPER_GGML#ggml-}"; WHISPER_NAME="${WHISPER_NAME%.bin}"  # → base.en
WHISPER_MODEL_PATH="$WHISPER_DIR/models/ggml-${WHISPER_NAME}.bin"          # → …/ggml-base.en.bin

echo "→ install prefix: $PREFIX"
sudo mkdir -p "$PREFIX" "$VOICES_DIR"
sudo chown "$(id -u):$(id -g)" "$PREFIX" "$VOICES_DIR"

# ── ffmpeg (also used by the music player) ──────────────────────────────
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "→ installing ffmpeg via apt…"
  sudo apt-get update -qq && sudo apt-get install -y ffmpeg
else
  echo "✓ ffmpeg present: $(command -v ffmpeg)"
fi

# ── whisper.cpp (STT) ───────────────────────────────────────────────────
if [[ ! -x "$WHISPER_DIR/build/bin/whisper-cli" ]]; then
  echo "→ building whisper.cpp…"
  sudo apt-get install -y git build-essential cmake
  [[ -d "$WHISPER_DIR" ]] || git clone --depth 1 https://github.com/ggml-org/whisper.cpp "$WHISPER_DIR"
  cmake -B "$WHISPER_DIR/build" -S "$WHISPER_DIR" -DCMAKE_BUILD_TYPE=Release
  cmake --build "$WHISPER_DIR/build" -j --config Release
else
  echo "✓ whisper-cli present"
fi
if [[ ! -f "$WHISPER_MODEL_PATH" ]]; then
  echo "→ fetching whisper model ggml-${WHISPER_NAME}.bin…"
  ( cd "$WHISPER_DIR" && bash ./models/download-ggml-model.sh "$WHISPER_NAME" )
  # download script drops it under models/ as ggml-<name>.bin
fi

# ── Piper (TTS) ─────────────────────────────────────────────────────────
if [[ ! -x "$PIPER_DIR/piper" ]]; then
  echo "→ installing Piper…"
  mkdir -p "$PIPER_DIR"
  ARCH="$(uname -m)"; case "$ARCH" in
    x86_64) PTAG="linux_x86_64" ;; aarch64) PTAG="linux_aarch64" ;;
    *) echo "unknown arch $ARCH — grab a Piper release manually" >&2; exit 1 ;;
  esac
  curl -fsSL "https://github.com/rhasspy/piper/releases/latest/download/piper_${PTAG}.tar.gz" \
    | tar -xz -C "$PREFIX"
else
  echo "✓ piper present"
fi
if [[ ! -f "$VOICES_DIR/${PIPER_VOICE_NAME}.onnx" ]]; then
  echo "→ fetching Piper voice $PIPER_VOICE_NAME…"
  LANG_DIR="${PIPER_VOICE_NAME%%-*}"        # en_US
  BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/${LANG_DIR}/${PIPER_VOICE_NAME#*_}"
  # voice paths on HF are en/en_US/<voice>/<quality>/<file>; resolve loosely:
  VOICE_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/${PIPER_VOICE_NAME#en_US-}"
  VOICE_BASE="${VOICE_BASE%-*}/${PIPER_VOICE_NAME##*-}"
  curl -fsSL "$VOICE_BASE/${PIPER_VOICE_NAME}.onnx"      -o "$VOICES_DIR/${PIPER_VOICE_NAME}.onnx"
  curl -fsSL "$VOICE_BASE/${PIPER_VOICE_NAME}.onnx.json" -o "$VOICES_DIR/${PIPER_VOICE_NAME}.onnx.json"
fi

cat <<EOF

✓ done. Put these in /etc/degenff/env, then: sudo systemctl restart degenff-bot

  PIPER_BIN=$PIPER_DIR/piper
  PIPER_VOICE=$VOICES_DIR/${PIPER_VOICE_NAME}.onnx
  WHISPER_BIN=$WHISPER_DIR/build/bin/whisper-cli
  WHISPER_MODEL=$WHISPER_MODEL_PATH
  FFMPEG_BIN=$(command -v ffmpeg || echo ffmpeg)

(If a download 404s — HF voice paths vary by quality tier — grab the .onnx +
 .onnx.json by hand from huggingface.co/rhasspy/piper-voices and drop them in
 $VOICES_DIR.)
EOF

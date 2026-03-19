#!/bin/bash
# Markdown → HTML 変換スクリプト（未踏アドバンスト提案書用）
# Usage: ./build.sh              — 一回ビルド
#        ./build.sh --watch      — 監視 + ブラウザ自動リロード
# sections/ 内の *.md をファイル名順に結合してビルドする

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SECTIONS_DIR="$SCRIPT_DIR/sections"
OUTPUT="$SCRIPT_DIR/未踏アドバンスト応募資料.html"
CSS="$SCRIPT_DIR/style.css"

WATCH=false
if [ "$1" = "--watch" ] || [ "$1" = "-w" ]; then
  WATCH=true
fi

build() {
  # sections/*.md をファイル名順に結合し、セクション間に --- を挿入
  local combined=""
  local first=true
  for f in "$SECTIONS_DIR"/*.md; do
    if [ "$first" = true ]; then
      first=false
    else
      combined+=$'\n\n---\n\n'
    fi
    combined+="$(cat "$f")"
  done

  echo "$combined" | pandoc \
    --standalone \
    --css="style.css" \
    --metadata title=" " \
    -f markdown \
    -t html5 \
    -o "$OUTPUT"
  echo "[$(date +%H:%M:%S)] Generated: $(basename "$OUTPUT")"
}

build

if [ "$WATCH" = true ]; then
  # fswatch でsections/とCSSを監視 → ビルド（バックグラウンド）
  fswatch -o "$SECTIONS_DIR" "$CSS" | while read; do
    build
  done &
  FSWATCH_PID=$!
  trap "kill $FSWATCH_PID 2>/dev/null; exit" INT TERM

  # browser-sync でHTMLの変更を検知 → ブラウザ自動リロード
  npx browser-sync start \
    --server "$SCRIPT_DIR" \
    --files "$OUTPUT" \
    --startPath "/$(basename "$OUTPUT")" \
    --no-open \
    --no-notify
fi

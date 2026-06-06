#!/bin/zsh
# UTAGE 手動同期 (朝の自動同期が動かなかった/結果が無いとき用)
# Usage: ./scripts/manual-utage-sync.sh
#
# 「直近X日UTAGE反映なかった?」と思ったらこれを実行。
# launchd 経由ではなく直接 morning-utage-sync.sh を呼ぶだけ。

DIR="$(cd "$(dirname "$0")"/.. && pwd)"

echo "================================================"
echo "  UTAGE 手動同期 $(date)"
echo "================================================"
echo ""

# 最新ログを確認
LATEST_LOG="$HOME/Library/Logs/utage-sync/latest.log"
if [ -L "$LATEST_LOG" ]; then
  LAST_RUN=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$LATEST_LOG" 2>/dev/null)
  echo "📅 最後の自動同期: $LAST_RUN"
  echo ""
fi

# Notion 上の各アカウント最新日を確認
echo "🔍 Notion DB の現状:"
cd "$DIR" && node scripts/check-notion-utage-latest.mjs 2>&1 | tail -20
echo ""

# 続行確認
read -k "REPLY?同期を実行しますか? [y/N] "
echo ""
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
  echo "中止しました"
  exit 0
fi

# 手動実行
"$DIR/scripts/morning-utage-sync.sh"

echo ""
echo "✓ 完了。ログ: ~/Library/Logs/utage-sync/latest.log"

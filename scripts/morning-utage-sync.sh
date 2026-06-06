#!/bin/zsh
# UTAGE → Notion 朝の自動同期
# launchd から呼ばれる想定。Claude Code を non-interactive で起動して UTAGE 最新を反映する。

set -u
cd /Users/takeshi/workspace/works/pl-dashboard

LOG_DIR="$HOME/Library/Logs/utage-sync"
mkdir -p "$LOG_DIR"
TS=$(date "+%Y%m%d_%H%M%S")
LOG="$LOG_DIR/$TS.log"
LATEST_LINK="$LOG_DIR/latest.log"

# 直近ログのシンボリックリンク
ln -sf "$LOG" "$LATEST_LINK"

{
  echo "=== UTAGE 朝の自動同期 $(date) ==="

  # caffeinate でスリープ防止しつつ claude を実行
  /usr/bin/caffeinate -i /Users/takeshi/.local/bin/claude --print --dangerously-skip-permissions <<'PROMPT'
UTAGE の今日までの新規リーダーを Notion に反映してください。

手順:
1. `cd /Users/takeshi/workspace/works/pl-dashboard && node scripts/check-notion-utage-latest.mjs` で各アカウントの Notion 最新日付を確認
2. 以下の active な (account, scenario) に対して mcp__claude_ai_UTAGE__message_reader_list_all を呼んでリーダーを取得 (per_page=100):
   - PjocL14v2u6j: yyog9fvedOtP, V98BSMwhViZC, ss0Y2tqzi9hW
   - 7qQJ38rzLtbM: XAz7XmBFO3yX, OQu9St8wqN9R
   - Tm32etw7epfS: fpZvVLcMvLMK, NidcrIoR9Aqi
   - TZq4ob5n4GZ1: 9lF9qbjgG5a8 (通年シナリオは message_tracking_name で TZq4_YT_VIDEO / TZq4_YT_DESC / TZq4_YT_POST / TZq4_SNS_THREADS / TZq4_SNS_X / TZq4_SNS_IG / TZq4_SNS_TIKTOK / TZq4_HP_BLOG / TZq4_HP_UTAGE / TZq4_META_REUSE / TZq4_META_K12 / TZq4_UNK に分類)
3. base_date が Notion 最新日付より新しいレコードのみ抽出、日別カウント
4. `scripts/upsert-utage-latest.mjs` を参考に upsert script を新規生成して実行 (流入経路マスター pageId を find して 日次リードDB に upsert)
5. 完了後、結果を 1行サマリ「YYYY-MM-DD UTAGE同期完了: 新規N件 / 更新M件」で出力

不明点があっても止まらず、できる範囲で実行・報告すること。
PROMPT

  echo "=== 完了 $(date) ==="
} 2>&1 | tee -a "$LOG"

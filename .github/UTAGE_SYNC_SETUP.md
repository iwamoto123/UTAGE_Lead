# UTAGE 日次同期について

同期は**このリポジトリでは動いていません**。`slack-automation` リポジトリの
GitHub Actions `utage-sync`（毎朝8:15 JST / `utage-sync/src/main.py`）に一本化しました。

- 集計対象は Notion「UTAGE 流入経路マスター」の `集計対象=true` の行。**追加・停止はNotion側で行う**（コード変更は不要）
- シナリオを分けていないアカウント（TZq4 = ローカルメディ）は `message_tracking_name` で
  仮想シナリオ（`TZq4_YT_VIDEO` 等）に振り分ける。ルールは `utage-sync/src/rules.py`
- Secrets は `slack-automation` 側の `NOTION_TOKEN` / `UTAGE_API_KEY`

かつては ①このリポジトリの GitHub Actions ②Macのlaunchdから毎朝Claude Codeを起こす
`scripts/morning-utage-sync.sh` の2本が並走し、同じ日を二重に書いていた。①は2026-08-07を最後に
失敗し続けていたため削除、②は2026-09-08に停止（plistは `~/Library/LaunchAgents/disabled-duplicated-by-github-actions/` に退避）。
手動で流し直したいときは `scripts/manual-utage-sync.sh` を使う。

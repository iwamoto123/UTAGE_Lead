# UTAGE 日次同期 GitHub Actions セットアップ手順

## 概要

毎日 JST 9:03 に `.github/workflows/utage-daily-sync.yml` が起動し、
`scripts/utage-daily-sync.mjs` が以下を実行します:

1. UTAGE API でアクティブな (account, scenario) のリーダー一覧を取得
2. Notion 日次リード数DB の最新日付以降を抽出
3. 日別カウントを Notion に upsert (TZq4 通年シナリオは `message_tracking_name` で仮想シナリオに分割)

## 前提

このリポジトリが GitHub にホストされていること(現状 remote 未設定)。
ローカルから push する手順:

```bash
cd pl-dashboard
git remote add origin git@github.com:<USER>/<REPO>.git
git add .
git commit -m "feat: UTAGE 日次同期 GH Actions"
git push -u origin main
```

## 必要な GitHub Secrets

リポジトリの Settings → Secrets and variables → Actions で以下を登録:

| Name | 内容 |
|---|---|
| `NOTION_TOKEN` | `.env.local` の `NOTION_TOKEN` をそのまま |
| `UTAGE_API_TOKEN` | UTAGE 管理画面 → 設定 → API設定 で発行した Bearer トークン |
| `UTAGE_API_BASE` (任意) | デフォルト `https://utage-system.com/api/v1`。違う場合のみ指定 |

## UTAGE API トークン取得方法

1. https://utage-system.com/ にログイン
2. 「設定」→「API・連携」→「APIトークン発行」
3. 発行されたトークンをコピーして GH Secrets に登録

※ トークン発行画面の場所はバージョンにより異なる可能性あり。
   見つからない場合は UTAGE サポートに「外部からAPIアクセスする方法」を問い合わせ。

## API エンドポイントの確認

スクリプトのデフォルトは `https://utage-system.com/api/v1/messages/readers` を使用。
UTAGE 側のドキュメントで実際の URL を確認し、違えば `UTAGE_API_BASE` を上書き。
レスポンス形式は MCP の `message_reader_list_all` と同じ JSON 構造を想定:

```json
{
  "data": [
    { "base_date": "2026-06-05 09:57:02", "message_tracking_name": "...", ... }
  ],
  "meta": { "total": 15, "current_page": 1, "per_page": 100 }
}
```

異なる場合は `scripts/utage-daily-sync.mjs` の `fetchReaders` を修正。

## 動作確認

1. GitHub Actions タブで「UTAGE 日次同期」ワークフローを選択
2. 「Run workflow」ボタンで手動実行
3. ログを確認し、`新規X / 更新Y` が出ていれば成功

## トラブルシューティング

- **401 Unauthorized**: トークン期限切れ or 権限不足
- **マスター未登録**: 流入経路マスター(Notion DB)に `UTAGEアカウントID|UTAGEシナリオID` の行が存在しない
- **TZq4 仮想シナリオが未登録**: `TZq4_YT_VIDEO`, `TZq4_META_REUSE` 等のマスター行が消えている

## アクティブアカウントの追加・削除

`scripts/utage-daily-sync.mjs` の `ACTIVE` 配列を編集してコミット。

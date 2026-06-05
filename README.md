# 📊 PL ダッシュボード

株式会社武士道の月次PL（売上・人件費・広告費・利益）を事業別／合計で閲覧できる社内ダッシュボード。データソースは Notion DB。

## 起動方法

```bash
cd /Users/takeshi/workspace/works/pl-dashboard
cp .env.local.example .env.local
# .env.local を開いて NOTION_TOKEN= に実トークンを貼る
npm run dev
# http://localhost:3000 にアクセス
```

## 環境変数

| 変数名 | 説明 |
|---|---|
| `NOTION_TOKEN` | Notion Integration の Access Token (必須) |
| `NOTION_DS_MONTHLY_PL` | 月次PL DB の data_source_id（デフォルト設定済み） |
| `NOTION_DS_WEEKLY_AD` | 週次広告レポート DB の data_source_id |
| `NOTION_DS_BUSINESS_YEAR` | 事業-年度 DB の data_source_id |
| `CACHE_TTL_SECONDS` | キャッシュ秒数（デフォルト 600 = 10分） |

## ページ構成

- `/` — PL ダッシュボード（事業タブ、期間切替、KPI、月次推移、損益計算書テーブル）
- `/status` — 入力状況モニター（事業×月のマトリクス、未提出判定）

## キャッシュ運用

- Notion API は10分キャッシュ（変更可）
- ヘッダー右上「🔄 リフレッシュ」ボタンで即時更新

## 必要な Notion 側の設定

Notion で以下3つのDBを開き、右上「...」→「Connections」→「PL Dashboard」を追加:
- 月次PL（売上・人件費・広告費・利益）
- 週次広告レポート
- 事業-年度

# 社員向けセットアップガイド

## 本番ダッシュボードへのアクセス (閲覧のみ)

**URL:** https://utage-lead.vercel.app

ベーシック認証が必要です:
- ID: `bushido`
- Pass: (別途 1Password / 個別連絡)

## Claude Code で開発・データ取込する場合

### 1. リポジトリの clone

社員の GitHub アカウントを Collaborator として追加してもらう必要があります。
管理者(岩本)に GitHub ユーザー名を伝えてください。

招待を受けたら:

```bash
gh repo clone iwamoto123/UTAGE_Lead
# または
git clone git@github.com:iwamoto123/UTAGE_Lead.git
cd UTAGE_Lead
```

### 2. 環境変数の設定

`.env.local` を作成 (管理者から共有された値を入れる):

```
NOTION_TOKEN=ntn_xxx...
```

### 3. 依存インストール & 起動

```bash
npm install
npm run dev
# → http://localhost:3000 で閲覧
```

### 4. Claude Code (任意)

このリポジトリには CLAUDE.md / .claude/ などのプロジェクト設定が含まれます。
Claude Code を起動するだけで、UTAGE/Notion との連携が使えます (UTAGE MCP は各人の Claude.ai アカウントで認証が必要)。

```bash
claude
```

## トラブルシューティング

- **401 Unauthorized**: ID/Pass を再確認
- **Notion API が動かない**: `.env.local` の `NOTION_TOKEN` を再確認
- **UTAGE MCP が呼べない**: Claude.ai 側で UTAGE Integration を connect

## 管理者用 (Collaborator 追加手順)

https://github.com/iwamoto123/UTAGE_Lead/settings/access → 「Add people」
- 社員の GitHub username 入力
- Role: Write (clone + push) または Read (clone のみ)

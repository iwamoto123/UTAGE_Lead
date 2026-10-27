// Notion 日次リード数DB の (account, scenario) 別 最新日付を確認
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DAILY_DS = "ff6be008-cddc-42ef-831f-9b327e056635";

const TARGETS = new Set([
  "PjocL14v2u6j|yyog9fvedOtP",
  "PjocL14v2u6j|V98BSMwhViZC",
  "PjocL14v2u6j|ss0Y2tqzi9hW",
  "7qQJ38rzLtbM|XAz7XmBFO3yX",
  "7qQJ38rzLtbM|OQu9St8wqN9R",
  "Tm32etw7epfS|fpZvVLcMvLMK",
  "Tm32etw7epfS|NidcrIoR9Aqi",
  "n99EYdMfgwxy|VJHxg3hQn8qy",
  "n99EYdMfgwxy|zZe1kylB5Nfr",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO",
  "TZq4ob5n4GZ1|TZq4_YT_DESC",
  "TZq4ob5n4GZ1|TZq4_YT_POST",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS",
  "TZq4ob5n4GZ1|TZq4_SNS_X",
  "TZq4ob5n4GZ1|TZq4_SNS_IG",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG",
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE",
  "TZq4ob5n4GZ1|TZq4_META_REUSE",
  "TZq4ob5n4GZ1|TZq4_META_K12",
  "TZq4ob5n4GZ1|TZq4_UNK",
]);

const rows = [];
let cursor;
do {
  const res = await notion.dataSources.query({ data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100 });
  rows.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

const byKey = new Map();
for (const p of rows) {
  const acc = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
  const sce = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
  const date = p.properties["日付"]?.date?.start ?? "";
  const key = `${acc}|${sce}`;
  if (!byKey.has(key)) byKey.set(key, "");
  if (date > byKey.get(key)) byKey.set(key, date);
}

console.log("=== ターゲット (account|scenario) 別 Notion 最新日付 ===");
for (const k of TARGETS) {
  console.log(`  ${k.padEnd(40)} ${byKey.get(k) ?? "(なし)"}`);
}

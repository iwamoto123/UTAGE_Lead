// R8塾生DB から特定の入塾者を検索 + 流入企画と入塾月を確認
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const STUDENT_DS = "72ee6524-b6fa-4426-a2f2-1e909d0dd7b0";

const rows = [];
let cursor;
do {
  const res = await notion.dataSources.query({
    data_source_id: STUDENT_DS, start_cursor: cursor, page_size: 100,
  });
  rows.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

console.log(`全${rows.length}件\n`);

const targets = ["中島悠翔", "中島 悠翔", "矢﨑幹人", "矢﨑 幹人", "矢崎幹人", "秋山蒼空", "秋山 蒼空"];

for (const p of rows) {
  const name = p.properties["名前"]?.title?.map((t) => t.plain_text).join("") ?? "";
  if (targets.some((t) => name.includes(t.replace(/\s/g, "")) || name.replace(/\s/g, "").includes(t.replace(/\s/g, "")))) {
    const month = p.properties["入塾月"]?.date?.start ?? "";
    const status = p.properties["ステータス"]?.select?.name ?? "";
    const ryunyuu = p.properties["流入企画"]?.relation ?? [];
    console.log(`✓ ${name}  入塾月:${month}  ステータス:${status}  流入企画ID:${ryunyuu.map((r) => r.id).join(",")}`);
  }
}

// 浪人生用LINE 経由を ステータスとラベルで探す
console.log("\n--- 浪人生 関連の塾生 ---");
for (const p of rows) {
  const name = p.properties["名前"]?.title?.map((t) => t.plain_text).join("") ?? "";
  const status = p.properties["ステータス"]?.select?.name ?? "";
  const month = p.properties["入塾月"]?.date?.start ?? "";
  const note = p.properties["備考"]?.rich_text?.map((t) => t.plain_text).join("") ?? "";
  if (note.includes("浪人") || name.includes("浪人")) {
    console.log(`  ${name}  ${month}  ${status}  note:${note.slice(0,60)}`);
  }
}

// 入塾月 2026-02〜2026-05 全件
console.log("\n--- 2026-02〜2026-05 入塾者 全件 ---");
const grouped = {};
for (const p of rows) {
  const month = p.properties["入塾月"]?.date?.start ?? "";
  if (!month) continue;
  const ym = month.slice(0, 7);
  if (ym < "2026-02" || ym > "2026-05") continue;
  if (!grouped[ym]) grouped[ym] = [];
  const name = p.properties["名前"]?.title?.map((t) => t.plain_text).join("") ?? "";
  const status = p.properties["ステータス"]?.select?.name ?? "";
  grouped[ym].push(`${name} (${status})`);
}
for (const ym of Object.keys(grouped).sort()) {
  console.log(`${ym} (${grouped[ym].length}件): ${grouped[ym].join(" / ")}`);
}

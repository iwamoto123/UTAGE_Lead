import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS = "3daa32a0-1673-4fe0-a45b-5a4d2183d001";
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const rows = await all(DS);
console.log(`動画編集タスク: ${rows.length}件`);
const G = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "select") return v.select?.name ?? null;
  if (v.type === "date") return v.date?.start ?? null;
  if (v.type === "people") return (v.people ?? []).map(x => x.name).filter(Boolean);
  return null; };
const bym = {}, prog = {}, ch = {}, people = {};
for (const p of rows) {
  const d = G(p, "公開までの締切") ?? G(p, "撮影予定日");
  const ym = d ? d.slice(0, 7) : "(日付なし)";
  bym[ym] = (bym[ym] ?? 0) + 1;
  const pr = G(p, "進捗") ?? "(未設定)"; prog[pr] = (prog[pr] ?? 0) + 1;
  const c = G(p, "チャンネル名") ?? "(未設定)"; ch[c] = (ch[c] ?? 0) + 1;
  for (const k of ["カット・テロップ入れ", "カット", "仕上げfcp", "完成までの仕上げ(fcp)", "アップロード"]) {
    for (const n of (G(p, k) ?? [])) people[n] = (people[n] ?? 0) + 1;
  }
}
console.log("プロパティ: " + Object.keys(rows[0]?.properties ?? {}).join(" / "));
console.log("\n— 月別(公開までの締切) —"); for (const [k, v] of Object.entries(bym).sort()) console.log(`   ${k}: ${v}件`);
console.log("\n— 進捗別 —"); for (const [k, v] of Object.entries(prog).sort((a, b) => b[1] - a[1])) console.log(`   ${k}: ${v}件`);
console.log("\n— チャンネル別 —"); for (const [k, v] of Object.entries(ch).sort((a, b) => b[1] - a[1])) console.log(`   ${k}: ${v}件`);
console.log("\n— 担当者別(のべ) —"); for (const [k, v] of Object.entries(people).sort((a, b) => b[1] - a[1])) console.log(`   ${k}: ${v}`);

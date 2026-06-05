// 講師DB(R8オンライン/R8ローカルメディ)から 講師名→事業 のマッピングを取得
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const ONLINE_DS = "2d649d91-8c94-4264-a516-5c031af05fdd";
const LOCALMEDI_DS = "a6b57e73-5f9b-445c-9904-3fe37ddfed22";

async function queryAll(dataSourceId) {
  const results = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

function title(p) {
  if (!p) return "";
  if (p.type === "title") return p.title.map((t) => t.plain_text).join("");
  return "";
}

const online = await queryAll(ONLINE_DS);
const localmedi = await queryAll(LOCALMEDI_DS);

const out = { 白谷塾オンライン: [], ローカルメディ: [] };
for (const p of online) {
  const name = title(p.properties["講師名"]);
  if (name) out["白谷塾オンライン"].push(name);
}
for (const p of localmedi) {
  const name = title(p.properties["講師名"]);
  if (name) out["ローカルメディ"].push(name);
}
console.log(JSON.stringify(out, null, 2));

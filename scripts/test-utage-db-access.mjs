// PL Dashboard tokenから新しいUTAGE DB 2個にアクセスできるか確認
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const TESTS = [
  { name: "UTAGE 流入経路マスター", ds: "097f9138-25b4-450c-be98-b116973d59df" },
  { name: "UTAGE 日次リード数", ds: "ff6be008-cddc-42ef-831f-9b327e056635" },
];

for (const t of TESTS) {
  try {
    await notion.dataSources.query({ data_source_id: t.ds, page_size: 1 });
    console.log(`✓ ${t.name} アクセスOK`);
  } catch (e) {
    console.log(`✗ ${t.name} アクセス不可: ${e.message}`);
  }
}

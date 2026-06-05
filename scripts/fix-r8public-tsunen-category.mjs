// 75qj4QCIIFrE | b9w2rcMtohfk のマスターを 公式LINE → YouTube自然流入 に更新
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";

const res = await notion.dataSources.query({
  data_source_id: SOURCE_DS,
  filter: { and: [
    { property: "UTAGEアカウントID", rich_text: { equals: "75qj4QCIIFrE" } },
    { property: "UTAGEシナリオID", rich_text: { equals: "b9w2rcMtohfk" } },
  ]},
  page_size: 1,
});
if (res.results.length === 0) { console.log("NOT FOUND"); process.exit(1); }
const pageId = res.results[0].id;
const before = res.results[0].properties["経路カテゴリ"]?.select?.name;
console.log(`before: ${before}`);
await notion.pages.update({
  page_id: pageId,
  properties: {
    "経路カテゴリ": { select: { name: "YouTube自然流入" } },
  },
});
console.log(`after: YouTube自然流入`);

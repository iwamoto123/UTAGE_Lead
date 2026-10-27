import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const ds = await notion.dataSources.retrieve({ data_source_id: "b8ee1633-7341-4fb8-a926-c308d35f1674" });
for (const [k, v] of Object.entries(ds.properties)) {
  if (v.type === "formula") console.log(`【${k}】\n  ${v.formula.expression}\n`);
}

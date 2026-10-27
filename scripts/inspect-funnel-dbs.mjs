import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_MENDAN = "e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb";
const DS_JUKUSEI = "72ee6524-b6fa-4426-a2f2-1e909d0dd7b0";
for (const [name, ds] of [["面談・体験生徒", DS_MENDAN], ["塾生", DS_JUKUSEI]]) {
  const s = await notion.dataSources.retrieve({ data_source_id: ds });
  console.log(`\n########## ${name} ##########`);
  for (const [k, v] of Object.entries(s.properties)) {
    let extra = "";
    if (v.type === "select") extra = " = " + v.select.options.map(o => o.name).join(" / ");
    if (v.type === "status") extra = " = " + v.status.options.map(o => o.name).join(" / ");
    if (v.type === "formula") extra = " := " + v.formula.expression.slice(0, 160);
    console.log(`  ${k} (${v.type})${extra}`);
  }
}

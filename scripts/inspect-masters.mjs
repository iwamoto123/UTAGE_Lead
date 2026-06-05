import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync("/Users/takeshi/workspace/works/pl-dashboard/.env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";

const TARGETS = [
  ["75qj4QCIIFrE", "b9w2rcMtohfk"],
  ["75qj4QCIIFrE", "2CdkRG1QSJcf"],
  ["75qj4QCIIFrE", "jUKgUorIA3SG"],
  ["75qj4QCIIFrE", ""],  // account-level
  ["qN7MMxMWLx3n", "HzupVPodqmDZ"],
  ["y7hyqMysZhxd", "9rOiW32JSgpN"],
  ["7oxtilRUXOBi", "hKbY9uPCSNkS"],
];

for (const [accId, sceId] of TARGETS) {
  const filter = sceId ? { and: [
    { property: "UTAGEアカウントID", rich_text: { equals: accId } },
    { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
  ]} : { and: [
    { property: "UTAGEアカウントID", rich_text: { equals: accId } },
    { property: "UTAGEシナリオID", rich_text: { is_empty: true } },
  ]};
  const res = await notion.dataSources.query({ data_source_id: SOURCE_DS, filter, page_size: 5 });
  if (res.results.length === 0) {
    console.log(`${accId} | ${sceId || "(account)"}: NOT FOUND`);
    continue;
  }
  for (const p of res.results) {
    const accName = p.properties["UTAGEアカウント名"]?.rich_text?.[0]?.plain_text ?? "";
    const sceName = p.properties["UTAGEシナリオ名"]?.rich_text?.[0]?.plain_text ?? "";
    const cat = p.properties["経路カテゴリ"]?.select?.name ?? "(none)";
    console.log(`${accId} | ${sceId || "(account)"}: cat=${cat} / ${accName} / ${sceName}`);
  }
}

// 株式会社武士道 通帳記帳（宮崎太陽銀行・普通預金）→ 月次PL 反映
// 令和8年(2026年) 4月〜8月。宮崎教室側の通帳は未入手のため地代家賃・水道光熱費は推定。
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const R8 = { 宮崎教室: "33588258-2d8c-8172-a026-f20baacea13a", 白谷塾オンライン: "33588258-2d8c-8160-ac00-d9a18a0238ed", ローカルメディ: "33588258-2d8c-81ce-8737-dbf973eca362" };
const DRY = process.argv.includes("--dry");

// 全社費用の事業配分（既存の社員給与 133,334/363,333/133,333 と同じ比率）
const SHARE = { 宮崎教室: 133334 / 630000, 白谷塾オンライン: 363333 / 630000, ローカルメディ: 133333 / 630000 };

// 通帳の明細を月ごとに集計したもの（★=通帳に記載がないため推定）
const BANK = {
  "2026-04": {
    給与: { サカイ: 182498, イワモト: 288937, ドイ: 31200, エヌプロダクション: 70000 },
    社会保険料: 311359, 税理士: 55000, 損害保険: 14973, 自動車税: 0, 現金引出: 0, 振込手数料: 1870,
    セゾン引落: 119218, 法人間入金: 0,
  },
  "2026-05": {
    給与: { サカイ: 201550, イワモト: 288505, スエヤス: 126725, ドイ: 100400, エヌプロダクション: 70000 },
    社会保険料: 223548, 税理士: 22000, 損害保険: 14973, 自動車税: 0, 現金引出: 81000, 振込手数料: 2530,
    セゾン引落: 181839, 法人間入金: 1000000, note: "社会保険料は6/1振替（5月分）",
  },
  "2026-06": {
    給与: { サカイ: 199250, イワモト: 286405, スエヤス: 126725, ドイ: 99898, エヌプロダクション: 70000 },
    社会保険料: 223548, 税理士: 159500, 損害保険: 14430, 自動車税: 36000, 現金引出: 93000, 振込手数料: 2860,
    セゾン引落: 145825, 法人間入金: 2099000, note: "税理士159,500は決算料を含む。法人間は+2,000,000+385,000−286,000",
  },
  "2026-07": {
    給与: { サカイ: 200050, イワモト: 287105, スエヤス: 126725, ドイ: 99898, シラタニ: 70000 },
    社会保険料: 223548, 税理士: 27500, 損害保険: 14430, 自動車税: 0, 現金引出: 142000, 振込手数料: 2860,
    セゾン引落: 167085, 法人間入金: 1500000, note: "エヌプロダクション→シラタニ コウジ に名義変更",
  },
  "2026-08": {
    給与: { サカイ: 200050, イワモト: 287105, イワモト2: 127758, スエヤス: 126725, ドイ: 99898, シラタニ: 70000 },
    社会保険料: 223548, 税理士: 27500, 損害保険: 14430, 自動車税: 0, 現金引出: 35000, 振込手数料: 3080,
    セゾン引落: 298999, 法人間入金: 1055000, note: "★社会保険料は通帳が8/28までのため推定（8/31振替予定）。イワモト2回目127,758あり",
  },
};

// 宮崎教室の通帳が未入手のため推定する項目（宮崎教室のみ）
const MIYAZAKI_EST = {
  地代家賃: 53330,                       // 5月実績
  水道光熱費: Math.round((63820 + 12769) / 2), // 4・5月平均 = 38,295
};

async function findPage(ym, bizId) {
  const r = await notion.dataSources.query({ data_source_id: DS, filter: { and: [{ property: "対象月", date: { equals: `${ym}-01` } }, { property: "事業-年度", relation: { contains: bizId } }] }, page_size: 1 });
  return r.results[0] ?? null;
}
const TAG = "武士道 通帳記帳 取込(2026-04〜08)";
const yen = (n) => "¥" + n.toLocaleString();

console.log(`=== 株式会社武士道 通帳 → 月次PL ${DRY ? "【DRY RUN】" : ""} ===`);
console.log(`全社費用の配分: 宮崎 ${(SHARE.宮崎教室 * 100).toFixed(1)}% / 白谷 ${(SHARE.白谷塾オンライン * 100).toFixed(1)}% / ローカル ${(SHARE.ローカルメディ * 100).toFixed(1)}%\n`);

for (const [ym, b] of Object.entries(BANK)) {
  const kyuyo = Object.values(b.給与).reduce((a, c) => a + c, 0);
  const jinken = kyuyo + b.社会保険料;                       // 社員給与＝役員報酬＋給与＋法定福利費
  const gyomu = b.税理士;                                    // 業務委託費＝税理士報酬
  const tesuryo = b.振込手数料;                               // 支払手数料
  const sonota = b.損害保険 + b.自動車税 + b.現金引出;         // その他経費
  console.log(`【${ym}】 給与 ${yen(kyuyo)} ＋ 社会保険料 ${yen(b.社会保険料)} = 人件費 ${yen(jinken)}`);
  console.log(`   内訳: ${Object.entries(b.給与).map(([k, v]) => `${k} ${yen(v)}`).join(" / ")}`);
  console.log(`   業務委託(税理士) ${yen(gyomu)} / 支払手数料 ${yen(tesuryo)} / その他経費 ${yen(sonota)}（損保${yen(b.損害保険)}＋自動車税${yen(b.自動車税)}＋現金引出${yen(b.現金引出)}）`);
  console.log(`   参考: セゾン引落 ${yen(b.セゾン引落)} / 法人間入金 ${yen(b.法人間入金)}${b.note ? "  ※" + b.note : ""}`);

  for (const bizName of ["白谷塾オンライン", "宮崎教室", "ローカルメディ"]) {
    const page = await findPage(ym, R8[bizName]);
    if (!page) { console.log(`   ! ${bizName}: レコードなし`); continue; }
    const hist = page.properties["アップロード履歴"]?.rich_text?.map((t) => t.plain_text).join("") ?? "";
    if (hist.includes(TAG)) { console.log(`   ⏭ ${bizName}: 反映済み`); continue; }
    const sh = SHARE[bizName];
    const props = {};
    const logs = [];
    const setAdd = (key, add) => { const prev = page.properties[key]?.number ?? 0; props[key] = { number: prev + add }; logs.push(`${key} ${yen(prev)}+${yen(add)}`); };
    const setTo = (key, val) => { const prev = page.properties[key]?.number ?? 0; props[key] = { number: val }; logs.push(`${key} ${yen(prev)}→${yen(val)}`); };
    setTo("社員給与", Math.round(jinken * sh));
    setAdd("業務委託費", Math.round(gyomu * sh));
    setAdd("支払手数料", Math.round(tesuryo * sh));
    setAdd("その他経費", Math.round(sonota * sh));
    if (bizName === "宮崎教室") {
      if ((page.properties["地代家賃"]?.number ?? 0) === 0) setTo("地代家賃", MIYAZAKI_EST.地代家賃);
      if ((page.properties["水道光熱費"]?.number ?? 0) === 0) setTo("水道光熱費", MIYAZAKI_EST.水道光熱費);
    }
    console.log(`   ${DRY ? "would update" : "update"} ${bizName.padEnd(9)} ${logs.join(" / ")}`);
    if (!DRY) {
      const ts = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
      props["アップロード履歴"] = { rich_text: [{ text: { content: [hist, `${ts} ${TAG} ${bizName}: ${logs.join(" / ")}`].filter(Boolean).join("\n") } }] };
      await notion.pages.update({ page_id: page.id, properties: props });
    }
  }
  console.log("");
}
console.log(DRY ? "DRY RUN 完了" : "完了");

/**
 * 短期プログラム（指導期間3週間）の継続確認判定。
 *   npx --yes tsx@4 scripts/trial-days.test.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

function loadEnv(file: string) {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}
loadEnv(".env.local");
if (!process.env.NOTION_TOKEN) process.env.NOTION_TOKEN = "test-token-for-unit";

async function main() {
  const {
    addCalendarDays,
    buildAlerts,
    campaignIsThreeWeek,
    isProgramStatus,
    needsContinuationWatch,
    stageOf,
    trialDaysFor,
    TRIAL_DAYS_PROGRAM,
  } = await import("../src/lib/students-core.ts");

function core(over: Record<string, unknown>) {
  return {
    id: "x",
    url: "",
    name: "テスト",
    source: "面談・体験",
    stage: "体験中",
    status: "体験中",
    business: "白谷塾オンライン",
    grade: "高3",
    courses: ["白谷塾オンライン"],
    teachers: ["甲斐"],
    teacherUnknown: false,
    aspiration: "",
    trialStart: "2026-09-17",
    lastInterview: "2026-09-17",
    lastCheck: "2026-09-17",
    condition: null,
    hasPolicy: true,
    weekFocus: "",
    goal: "",
    todo: "",
    reportStatus: "",
    reportLastDate: null,
    daysElapsed: 0,
    trialDays: TRIAL_DAYS_PROGRAM,
    campaigns: ["R8 共テ残り100日 塾に通っていない生徒向け"],
    continuationOn: "2026-10-08",
    ...over,
  };
}

assert.equal(campaignIsThreeWeek("R8 共テ残り100日 塾に通っていない生徒向け"), true);
assert.equal(campaignIsThreeWeek("R8 9月の模試 集中対策プログラム メインLINE"), true);
assert.equal(campaignIsThreeWeek("9月模試対策（保護者用）"), true);
assert.equal(campaignIsThreeWeek("共テスト100日前対策（非通塾者）"), true);
assert.equal(campaignIsThreeWeek("スタートダッシュプログラム"), false);
assert.equal(trialDaysFor(["白谷塾オンライン"], ["R8 共テ残り100日 保護者向け"]), 21);
assert.equal(trialDaysFor(["短期プログラム"], []), 21);
assert.equal(trialDaysFor(["再受験コース"], []), 14);
assert.equal(trialDaysFor(["白谷塾オンライン"], []), 7);
assert.equal(addCalendarDays("2026-09-17", 21), "2026-10-08");

// 2026-09にNotionのステータスを「体験中」から分離した。段階も体験日数もそのまま引き継ぐ
assert.equal(isProgramStatus("9月のプログラム実施中"), true);
assert.equal(isProgramStatus("残り100日プログラム実施中"), true);
assert.equal(isProgramStatus("体験中"), false);
assert.equal(stageOf("9月のプログラム実施中", "面談・体験"), "体験中");
assert.equal(stageOf("残り100日プログラム実施中", "面談・体験"), "体験中");
assert.equal(trialDaysFor(["白谷塾オンライン"], [], "9月のプログラム実施中"), 21);
assert.equal(trialDaysFor(["白谷塾オンライン"], [], "残り100日プログラム実施中"), 21);

// 2026-10に「結果」「継続確認」をステータス1列へ統合した
assert.equal(isProgramStatus("継続確認中"), true);
assert.equal(stageOf("継続確認中", "面談・体験"), "体験中");
assert.equal(stageOf("プログラム後終了", "面談・体験"), "その他");
assert.equal(stageOf("体験後お断り", "面談・体験"), "その他");
assert.equal(stageOf("返信なし", "面談・体験"), "その他");
assert.equal(stageOf("他の塾も体験後に最終決定", "面談・体験"), "その他");
assert.equal(stageOf("塾生", "塾生"), "塾生");
assert.equal(trialDaysFor(["白谷塾オンライン"], [], "継続確認中"), 21);
assert.equal(needsContinuationWatch(core({ status: "9月のプログラム実施中", daysElapsed: 21 })), true);

const today = new Date("2026-10-08T03:00:00+09:00");

const due = core({ daysElapsed: 21, continuationOn: "2026-10-08" });
const dueAlerts = buildAlerts(due, today);
assert.ok(dueAlerts.some((a) => a.level === "red" && a.label.includes("今日が継続確認")));
assert.equal(needsContinuationWatch(due), true);

const soon = core({ daysElapsed: 19, continuationOn: "2026-10-08" });
assert.ok(buildAlerts(soon, today).some((a) => a.label.includes("あと2日")));
assert.equal(needsContinuationWatch(soon), true);

const missingStart = core({ trialStart: null, continuationOn: "2026-10-08", daysElapsed: 1 });
assert.ok(buildAlerts(missingStart, today).some((a) => a.label.includes("仮計算")));
assert.equal(needsContinuationWatch(missingStart), false);

const noDates = core({ trialStart: null, lastInterview: null, continuationOn: null, daysElapsed: null });
assert.ok(buildAlerts(noDates, today).some((a) => a.label.includes("起点がない")));
assert.equal(needsContinuationWatch(noDates), true);

const regular = core({
  trialDays: 7,
  campaigns: [],
  continuationOn: "2026-09-24",
  daysElapsed: 3,
});
assert.equal(needsContinuationWatch(regular), false);

console.log("trial-days.test.ts ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

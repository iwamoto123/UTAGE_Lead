/**
 * 生徒ダッシュボードの中身を、devサーバーを起動せずに確認する。
 *
 *   npm run check:students          … 上位20名を表示
 *   npm run check:students -- --all … 全員表示
 *
 * Notionから読むだけで、書き込みはしない。
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// notion.ts は読み込み時にトークンを要求するので、先に .env.local を入れてから import する
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

const RESET = "\x1b[0m";
const COLOR = { red: "\x1b[31m", orange: "\x1b[33m", yellow: "\x1b[90m" } as const;

async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error("NOTION_TOKEN がありません。pl-dashboard/.env.local を確認してください。");
    process.exit(1);
  }

  const { assembleStudents } = await import("../src/lib/students-core.ts");
  const { queryAll, fetchTeacherNames, STUDENT_DS } = await import("../src/lib/students.ts");

  const [teachers, taiken, jukusei] = await Promise.all([
    fetchTeacherNames(),
    queryAll(STUDENT_DS.taiken),
    queryAll(STUDENT_DS.jukusei),
  ]);

  if (!teachers.eikenAvailable) {
    console.log("※ 英検コース講師DBが未接続です。英検コース生の担当は判定できません。");
  }

  const today = new Date();
  const students = assembleStudents(taiken, jukusei, teachers.names, today, teachers.eikenAvailable);

  const noTeacher = students.filter((s) => s.alerts.some((a) => a.label.startsWith("担当講師が未設定")));
  const milestone = students.filter((s) => s.alerts.some((a) => a.label.startsWith("今日が")));
  const red = students.filter((s) => s.alerts[0]?.level === "red");

  const jst = new Date(today.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  console.log(`\n生徒ダッシュボード（${jst} 時点）`);
  console.log(`  対象 ${students.length}名 ／ 担当未設定 ${noTeacher.length} ／ 今日が節目 ${milestone.length} ／ 赤 ${red.length}\n`);

  const limit = process.argv.includes("--all") ? students.length : 20;
  for (const s of students.slice(0, limit)) {
    const teacher = s.teachers.length ? s.teachers.join("・") : s.teacherUnknown ? "確認できません" : "未設定";
    const days = s.daysElapsed !== null ? `${s.daysElapsed}日` : "—";
    console.log(`${s.name.padEnd(8, "　")} ${s.stage.padEnd(4)} ${days.padStart(5)}  担当:${teacher}`);
    for (const a of s.alerts) {
      console.log(`    ${COLOR[a.level]}● ${a.label}${RESET}`);
    }
  }
  if (limit < students.length) console.log(`\n…ほか ${students.length - limit}名（--all で全員）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

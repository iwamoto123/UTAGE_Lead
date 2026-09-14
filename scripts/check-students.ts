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

  const { assembleStudents, attachTeacherAssignments } = await import("../src/lib/students-core.ts");
  const { queryAll, fetchTeachers, STUDENT_DS } = await import("../src/lib/students.ts");

  const [pack, taiken, jukusei] = await Promise.all([
    fetchTeachers(),
    queryAll(STUDENT_DS.taiken),
    queryAll(STUDENT_DS.jukusei),
  ]);

  if (!pack.eikenAvailable) {
    console.log("※ 英検コース講師DBが未接続です。英検コース生の担当は判定できません。");
  }

  const today = new Date();
  const students = assembleStudents(taiken, jukusei, pack.names, today, pack.eikenAvailable);
  const teachers = attachTeacherAssignments(pack.teachers, students);

  const noTeacher = students.filter((s) => s.alerts.some((a) => a.label.startsWith("担当講師が未設定")));
  const milestone = students.filter((s) => s.alerts.some((a) => a.label.startsWith("今日が")));
  const red = students.filter((s) => s.alerts[0]?.level === "red");

  const jst = new Date(today.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  console.log(`\n生徒ダッシュボード（${jst} 時点）`);
  console.log(`  対象 ${students.length}名 ／ 担当未設定 ${noTeacher.length} ／ 今日が節目 ${milestone.length} ／ 赤 ${red.length}`);
  console.log(`  講師 ${teachers.length}名 ／ キャパ回答 ${teachers.filter((t) => t.capacity).length} ／ 未回答 ${teachers.filter((t) => !t.capacity).length}\n`);

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

  console.log("\n講師の対応キャパ");
  for (const t of teachers) {
    const cap = t.capacity || "未回答";
    const sub = t.subjects ? ` ／ ${t.subjects}` : "";
    const names = t.assignedNames.length ? `（${t.assignedNames.join("・")}）` : "";
    console.log(`  ${t.name.padEnd(14, "　")} ${t.group.padEnd(8)} 担当${t.assignedCount}  ${cap}${sub}${names}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

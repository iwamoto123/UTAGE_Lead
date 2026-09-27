/** /students がブラウザへ送るデータ量と取得時間を、devサーバーなしで測る。
 *   npx tsx scripts/measure-students-payload.ts
 * RSCのペイロードが大きすぎると本番（Vercel）で配信に失敗することがあるので、その確認用。 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// notion.ts は読み込み時にトークンを要求するので、先に .env.local を入れてから import する
for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && m[2].trim() && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["\']|["\']$/g, "");
}

async function main() {
  // unstable_cache はNextのレンダリング中でないと動かないので、中身を直接呼ぶ
  const { assembleStudents, attachTeacherAssignments } = await import("../src/lib/students-core.ts");
  const { queryAll, fetchTeachers, fetchCampaignNames, STUDENT_DS } = await import("../src/lib/students.ts");
  const t0 = Date.now();
  const [pack, taiken, jukusei, campaigns] = await Promise.all([
    fetchTeachers(), queryAll(STUDENT_DS.taiken), queryAll(STUDENT_DS.jukusei), fetchCampaignNames(),
  ]);
  const students = assembleStudents(taiken, jukusei, pack.names, new Date(), pack.eikenAvailable, campaigns);
  const d = { students, teachers: attachTeacherAssignments(pack.teachers, students), eikenAvailable: pack.eikenAvailable };
  const ms = Date.now() - t0;
  const json = JSON.stringify(d);
  console.log(`取得 ${ms}ms / 生徒 ${d.students.length}人 / 講師 ${d.teachers.length}人`);
  console.log(`シリアライズ後 ${(Buffer.byteLength(json) / 1024).toFixed(0)} KB`);
  const keys = Object.keys(d.students[0] ?? {});
  const sizes = keys
    .map((k) => [k, d.students.reduce((a, x: any) => a + Buffer.byteLength(JSON.stringify(x[k] ?? null)), 0)] as const)
    .sort((a, b) => b[1] - a[1]);
  console.log("\n重いフィールド:");
  for (const [k, b] of sizes.slice(0, 12)) console.log(`  ${k.padEnd(22)} ${(b / 1024).toFixed(0)} KB`);
}
main();

import { unstable_cache } from "next/cache";
import { notion } from "./notion";
import { assembleStudents, text, type NotionPage, type Student } from "./students-core";

/**
 * 生徒ダッシュボードのデータ取得。
 * 判定ロジックは students-core.ts 側にある（devサーバーなしで確認できるように分けてある）。
 */

export type { Student, StudentAlert, AlertLevel, Stage } from "./students-core";

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? "600", 10);

export const STUDENT_DS = {
  taiken: process.env.NOTION_DS_TAIKEN_STUDENT ?? "e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb",
  jukusei: process.env.NOTION_DS_JUKUSEI ?? "72ee6524-b6fa-4426-a2f2-1e909d0dd7b0",
  teacherOnline: process.env.NOTION_DS_TEACHER_ONLINE ?? "2d649d91-8c94-4264-a516-5c031af05fdd",
  teacherLocalmedi: process.env.NOTION_DS_TEACHER_LOCALMEDI ?? "a6b57e73-5f9b-445c-9904-3fe37ddfed22",
  teacherEiken: process.env.NOTION_DS_TEACHER_EIKEN ?? "292ed607-f7f8-48e3-9dca-34b90ab8eb30",
};

export async function queryAll(dataSourceId: string): Promise<NotionPage[]> {
  const out: NotionPage[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res = (await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    })) as unknown as { results: NotionPage[]; has_more: boolean; next_cursor: string | null };
    out.push(...res.results);
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return out;
}

/**
 * 講師DBのページID → 氏名。
 *
 * Notionは参照権限のないDBへのリレーションを「プロパティは返すが中身は空」で返す。
 * 英検コース講師DBを読めたかどうかも一緒に返し、読めないときは
 * 英検コース生を「担当未設定」と誤判定しないようにする。
 */
export async function fetchTeacherNames(): Promise<{
  names: Map<string, string>;
  eikenAvailable: boolean;
}> {
  const names = new Map<string, string>();
  let eikenAvailable = true;

  for (const ds of [STUDENT_DS.teacherOnline, STUDENT_DS.teacherLocalmedi, STUDENT_DS.teacherEiken]) {
    try {
      for (const page of await queryAll(ds)) {
        const name =
          text(page.properties["講師名"]) || text(page.properties["名前"]) || text(page.properties["氏名"]);
        if (name) names.set(page.id, name);
      }
    } catch {
      // Notionでこのインテグレーションに接続されていないDB
      if (ds === STUDENT_DS.teacherEiken) eikenAvailable = false;
    }
  }
  return { names, eikenAvailable };
}

async function _fetchStudents(): Promise<Student[]> {
  const [teachers, taiken, jukusei] = await Promise.all([
    fetchTeacherNames(),
    queryAll(STUDENT_DS.taiken),
    queryAll(STUDENT_DS.jukusei),
  ]);
  return assembleStudents(taiken, jukusei, teachers.names, new Date(), teachers.eikenAvailable);
}

export const getStudents = unstable_cache(_fetchStudents, ["students"], {
  revalidate: CACHE_TTL,
  tags: ["students"],
});

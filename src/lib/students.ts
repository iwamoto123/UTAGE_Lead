import { unstable_cache } from "next/cache";
import { notion } from "./notion";
import {
  assembleStudents,
  attachTeacherAssignments,
  text,
  toTeacher,
  type NotionPage,
  type Student,
  type Teacher,
  type TeacherGroup,
} from "./students-core";

/**
 * 生徒ダッシュボードのデータ取得。
 * 判定ロジックは students-core.ts 側にある（devサーバーなしで確認できるように分けてある）。
 */

export type { Student, StudentAlert, AlertLevel, Stage, Teacher, TeacherGroup } from "./students-core";

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

const TEACHER_DS: { id: string; group: TeacherGroup }[] = [
  { id: STUDENT_DS.teacherOnline, group: "オンライン" },
  { id: STUDENT_DS.teacherLocalmedi, group: "ローカルメディ" },
  { id: STUDENT_DS.teacherEiken, group: "英検" },
];

/**
 * 講師DBのページID → 氏名、とキャパ用の講師一覧。
 *
 * Notionは参照権限のないDBへのリレーションを「プロパティは返すが中身は空」で返す。
 * 英検コース講師DBを読めたかどうかも一緒に返し、読めないときは
 * 英検コース生を「担当未設定」と誤判定しないようにする。
 */
export async function fetchTeachers(): Promise<{
  names: Map<string, string>;
  eikenAvailable: boolean;
  teachers: Teacher[];
}> {
  const names = new Map<string, string>();
  const teachers: Teacher[] = [];
  let eikenAvailable = true;

  for (const { id, group } of TEACHER_DS) {
    try {
      for (const page of await queryAll(id)) {
        const name =
          text(page.properties["講師名"]) || text(page.properties["名前"]) || text(page.properties["氏名"]);
        if (name) names.set(page.id, name);
        const teacher = toTeacher(page, group);
        if (teacher) teachers.push(teacher);
      }
    } catch {
      // Notionでこのインテグレーションに接続されていないDB
      if (group === "英検") eikenAvailable = false;
    }
  }
  return { names, eikenAvailable, teachers };
}

export async function fetchTeacherNames(): Promise<{
  names: Map<string, string>;
  eikenAvailable: boolean;
}> {
  const { names, eikenAvailable } = await fetchTeachers();
  return { names, eikenAvailable };
}

export type StudentsPageData = { students: Student[]; teachers: Teacher[]; eikenAvailable: boolean };

async function _fetchStudentsPage(): Promise<StudentsPageData> {
  const [pack, taiken, jukusei] = await Promise.all([
    fetchTeachers(),
    queryAll(STUDENT_DS.taiken),
    queryAll(STUDENT_DS.jukusei),
  ]);
  const students = assembleStudents(taiken, jukusei, pack.names, new Date(), pack.eikenAvailable);
  return {
    students,
    teachers: attachTeacherAssignments(pack.teachers, students),
    eikenAvailable: pack.eikenAvailable,
  };
}

export const getStudentsPageData = unstable_cache(_fetchStudentsPage, ["students"], {
  revalidate: CACHE_TTL,
  tags: ["students"],
});

export async function getStudents(): Promise<Student[]> {
  return (await getStudentsPageData()).students;
}

// 学年・属性ラベルの計算。学年度は4月始まり。
import { gradeLabel, yearsOf, type SchoolKind } from "./schools";

export type Role = "student" | "alumni" | "admin";
export type Stream = "science" | "humanities" | "undecided";
export type ClubType = "sports" | "culture" | "other" | "none";
export type PathType = "university" | "grad_school" | "vocational" | "employed" | "exam" | "other";

export const streamLabels: Record<Stream, string> = { science: "理系", humanities: "文系", undecided: "未定・どちらも" };
export const clubLabels: Record<ClubType, string> = { sports: "運動部", culture: "文化部", other: "同好会・その他", none: "所属なし" };
export const pathLabels: Record<PathType, string> = {
  university: "大学", grad_school: "大学院", vocational: "専門学校", employed: "就職", exam: "浪人・受験中", other: "その他",
};

/** 日本時間の「今の学年度」（4月〜翌3月）。 */
export function currentSchoolYear(now = new Date()): number {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  return jst.getUTCMonth() >= 3 ? jst.getUTCFullYear() : jst.getUTCFullYear() - 1;
}

/** 入学年度から学年（1年生が 1）。学校の年数を過ぎていたら、年数より大きい値を返す。 */
export function gradeOf(entryYear: number, now = new Date()): number {
  return currentSchoolYear(now) - entryYear + 1;
}

type Attrs = {
  role: Role;
  entry_year: number | null;
  graduation_year: number | null;
  stream: Stream | null;
  club_type: ClubType | null;
  university_year: number | null;
  school_kind?: SchoolKind | null;
  /** 公開している学校名（匿名・非公開なら null） */
  school?: string | null;
};

/** 回答者・投稿者の属性ラベル。例：{ role: "卒業生", meta: "大学2回生・理系・運動部" } */
export function attrLabel(a: Attrs): { role: string; meta: string } {
  const parts: string[] = [];
  if (a.role === "student") {
    if (a.entry_year) {
      const g = gradeOf(a.entry_year);
      // 種類が分からない（移行前のデータ）ときは 6年制として数える
      if (g >= 1 && g <= yearsOf(a.school_kind)) parts.push(gradeLabel(a.school_kind ?? "secondary", g));
    }
  } else if (a.role === "alumni") {
    if (a.university_year) parts.push(a.university_year >= 7 ? "卒業済み・社会人" : `大学${a.university_year}回生`);
  }
  if (a.stream && a.stream !== "undecided") parts.push(streamLabels[a.stream]);
  if (a.club_type && a.club_type !== "none") parts.push(clubLabels[a.club_type]);
  if (a.school) parts.push(a.school);
  return { role: a.role === "alumni" ? "卒業生" : a.role === "admin" ? "運営" : "在校生", meta: parts.join("・") };
}

/** 相談・回答に添えた投稿者の情報から属性ラベルを作る */
export function attrFromAuthor(a: {
  role: Role | "admin";
  entryYear: number | null;
  stream: Stream | null;
  clubType: ClubType | null;
  universityYear: number | null;
  schoolKind?: SchoolKind | null;
  school?: string | null;
}) {
  return attrLabel({
    role: a.role,
    entry_year: a.entryYear,
    graduation_year: null,
    stream: a.stream,
    club_type: a.clubType,
    university_year: a.universityYear,
    school_kind: a.schoolKind ?? null,
    school: a.school ?? null,
  });
}

export function formatDate(v: string | number | Date | { toDate(): Date } | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "object" && "toDate" in v ? v.toDate() : new Date(v);
  return d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric" });
}

// 学校：種類ごとの学年の数え方・卒業までの年数・検索用の索引
export type SchoolKind = "secondary" | "combined" | "junior" | "high" | "kosen";

export const schoolKinds: { id: SchoolKind; label: string; years: number }[] = [
  { id: "high", label: "高校", years: 3 },
  { id: "junior", label: "中学校", years: 3 },
  { id: "combined", label: "中高一貫校", years: 6 },
  { id: "secondary", label: "中等教育学校", years: 6 },
  { id: "kosen", label: "高専", years: 5 },
];

export const yearsOf = (kind: SchoolKind | null | undefined) => schoolKinds.find((k) => k.id === kind)?.years ?? 6;

/** 学年の呼び方。例：高校の2年 → 「高2」、中等教育学校の4年 → 「4年」 */
export function gradeLabel(kind: SchoolKind | null | undefined, g: number) {
  switch (kind) {
    case "junior":
      return `中${g}`;
    case "high":
      return `高${g}`;
    case "combined":
      return g <= 3 ? `中${g}` : `高${g - 3}`;
    default:
      return `${g}年`; // 中等教育学校・高専・不明
  }
}

export const prefectures = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県",
  "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県",
  "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県", "海外",
];

/** 検索用に表記をそろえる（全角・半角、空白、大文字小文字） */
export function normalizeName(s: string) {
  return s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

/** 2文字ずつの索引（学校名のどこからでも検索できるように） */
export function bigrams(s: string) {
  const t = normalizeName(s);
  const set = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return [...set].slice(0, 60);
}

export type School = {
  id: string;
  name: string;
  prefecture: string;
  kind: SchoolKind;
  status: "pending" | "verified" | "hidden";
};

/** 相談の公開範囲 */
export const audienceOf = (schoolId: string | null | undefined, scope: "national" | "school") =>
  scope === "school" && schoolId ? `school:${schoolId}` : "national";

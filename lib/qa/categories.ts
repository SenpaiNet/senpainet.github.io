import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { fb } from "@/lib/firebase/client";

export type Category = { slug: string; name: string; sortOrder: number; isActive: boolean };

/** 初期カテゴリ（SPEC §3）。qaCategories コレクションが空のときはこれを使う */
export const defaultCategories: Category[] = [
  ["jukenn", "受験・進路"],
  ["daigaku", "大学生活"],
  ["bukatsu", "部活動"],
  ["jugyou", "授業・勉強"],
  ["shinro", "文理選択"],
  ["ryugaku", "留学・国際"],
  ["shikaku", "資格・検定"],
  ["jinkan", "人間関係"],
  ["seikatsu", "学校生活"],
  ["shushoku", "就活・キャリア"],
  ["ib", "IB・課題研究"],
  ["sonota", "その他"],
].map(([slug, name], i) => ({ slug, name, sortOrder: i + 1, isActive: true }));

let cached: Category[] | null = null;

export async function loadCategories(includeInactive = false): Promise<Category[]> {
  const f = fb();
  if (!f) return defaultCategories;
  if (!cached || includeInactive) {
    try {
      const snap = await getDocs(collection(f.db, "qaCategories"));
      const list = snap.docs
        .map((d) => ({ slug: d.id, ...(d.data() as Omit<Category, "slug">) }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const result = list.length ? list : defaultCategories;
      if (includeInactive) return result;
      cached = result;
    } catch {
      cached = defaultCategories;
    }
  }
  return cached.filter((c) => c.isActive);
}

export function clearCategoryCache() {
  cached = null;
}

export function useCategories() {
  const [cats, setCats] = useState<Category[]>(defaultCategories);
  useEffect(() => {
    let alive = true;
    loadCategories().then((c) => alive && setCats(c));
    return () => {
      alive = false;
    };
  }, []);
  return cats;
}

export function categoryName(cats: Category[], slug: string) {
  return cats.find((c) => c.slug === slug)?.name ?? defaultCategories.find((c) => c.slug === slug)?.name ?? slug;
}

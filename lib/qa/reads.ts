// Firestore からの読み込み。ルールに合わせて、公開の一覧は必ず visible == true で絞る。
import {
  collection,
  collectionGroup,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentSnapshot,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import type { QaAnswer, QaQuestion } from "./types";

export function toQuestion(d: DocumentSnapshot): QaQuestion {
  return { id: d.id, ...(d.data() as Omit<QaQuestion, "id">) };
}
export function toAnswer(d: DocumentSnapshot, questionId?: string): QaAnswer {
  return {
    id: d.id,
    questionId: questionId ?? d.ref.parent.parent?.id ?? "",
    ...(d.data() as Omit<QaAnswer, "id" | "questionId">),
  };
}

export type BoardSort = "new" | "many" | "open";
/** audience：national（全国）か school:学校ID（学内）。ルールで必須 */
export type BoardFilter = { audience: string; category?: string; sort: BoardSort; unanswered: boolean };

export const PAGE_SIZE = 20;

export async function listQuestions(db: Firestore, f: BoardFilter, after?: DocumentSnapshot) {
  const cs: QueryConstraint[] = [where("visible", "==", true), where("audience", "==", f.audience)];
  if (f.category) cs.push(where("categories", "array-contains", f.category));
  if (f.unanswered) cs.push(where("answerCount", "==", 0));
  if (f.sort === "open") cs.push(where("status", "==", "open"));
  if (f.sort === "many" && !f.unanswered) cs.push(orderBy("answerCount", "desc"));
  cs.push(orderBy("createdAt", "desc"));
  if (after) cs.push(startAfter(after));
  cs.push(limit(PAGE_SIZE));
  const snap = await getDocs(query(collection(db, "questions"), ...cs));
  return { items: snap.docs.map(toQuestion), last: snap.docs[snap.docs.length - 1] as DocumentSnapshot | undefined, full: snap.size === PAGE_SIZE };
}

/** 本文（ログインした人だけ読める）。読めなければ null */
export async function getBody(db: Firestore, id: string) {
  try {
    const d = await getDoc(doc(db, "questionBodies", id));
    return d.exists() ? (d.data().body as string) : null;
  } catch {
    return null;
  }
}

/** 自分の相談か（questionOwners は本人と運営しか読めない） */
export async function getOwnership(db: Firestore, id: string, uid: string) {
  try {
    const d = await getDoc(doc(db, "questionOwners", id));
    return d.exists() && d.data().uid === uid ? { seenAnswerCount: (d.data().seenAnswerCount as number) ?? 0 } : null;
  } catch {
    return null;
  }
}

export async function listAnswers(db: Firestore, questionId: string, audience: string) {
  const snap = await getDocs(
    query(
      collection(db, "questions", questionId, "qaAnswers"),
      where("status", "==", "visible"),
      where("audience", "==", audience),
      orderBy("createdAt", "asc"),
    ),
  );
  return snap.docs.map((d) => toAnswer(d, questionId));
}

/** 自分が「参考になった」を付けた回答の id */
export async function myVotes(db: Firestore, questionId: string, answerIds: string[], uid: string) {
  const res = await Promise.all(
    answerIds.map(async (aid) => {
      try {
        const v = await getDoc(doc(db, "questions", questionId, "qaAnswers", aid, "qaVotes", uid));
        return v.exists() ? aid : null;
      } catch {
        return null;
      }
    }),
  );
  return new Set(res.filter(Boolean) as string[]);
}

/** 自分の相談（questionOwners → questions） */
export async function myQuestions(db: Firestore, uid: string) {
  const owners = await getDocs(query(collection(db, "questionOwners"), where("uid", "==", uid)));
  const qs = await Promise.all(
    owners.docs.map(async (o) => {
      const q = await getDoc(doc(db, "questions", o.id)).catch(() => null);
      if (!q?.exists()) return null;
      return { question: toQuestion(q), seenAnswerCount: (o.data().seenAnswerCount as number) ?? 0 };
    }),
  );
  return qs
    .filter((x): x is { question: QaQuestion; seenAnswerCount: number } => x !== null)
    .sort((a, b) => (b.question.createdAt?.toMillis() ?? 0) - (a.question.createdAt?.toMillis() ?? 0));
}

/** ある人の回答。自分の回答（onlyVisible=false）は非表示中・学内も含めて全部。ほかの人の回答は公開範囲ごとに読む */
export async function answersBy(db: Firestore, uid: string, onlyVisible: boolean, max = 50, audience = "national") {
  const cs: QueryConstraint[] = [where("author.id", "==", uid)];
  if (onlyVisible) cs.push(where("status", "==", "visible"), where("audience", "==", audience));
  cs.push(orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(query(collectionGroup(db, "qaAnswers"), ...cs));
  return snap.docs.map((d) => toAnswer(d));
}

/** 相談のタイトルをまとめて取る（読めないものは除く） */
export async function titlesOf(db: Firestore, ids: string[]) {
  const map = new Map<string, QaQuestion>();
  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      const q = await getDoc(doc(db, "questions", id)).catch(() => null);
      if (q?.exists()) map.set(id, toQuestion(q));
    }),
  );
  return map;
}

export async function siteStats(db: Firestore) {
  const visible = query(collection(db, "questions"), where("visible", "==", true), where("audience", "==", "national"));
  const [all, answered] = await Promise.all([
    getCountFromServer(visible),
    getCountFromServer(query(collection(db, "questions"), where("visible", "==", true), where("audience", "==", "national"), where("answerCount", ">", 0))),
  ]);
  return { questions: all.data().count, answered: answered.data().count };
}

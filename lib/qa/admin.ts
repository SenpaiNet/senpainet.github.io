// 運営の操作。ルールで isAdmin() のときだけ許可される。
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { defaultCategories } from "./categories";
import type { QaReport } from "./types";

export type ReportAction = "hide" | "delete" | "warn" | "suspend" | "dismiss";

/** 通報の対象と、その投稿者の uid（匿名の相談は questionOwners から） */
export async function resolveTarget(db: Firestore, r: QaReport) {
  if (r.targetType === "question") {
    const [q, body, owner] = await Promise.all([
      getDoc(doc(db, "questions", r.targetId)),
      getDoc(doc(db, "questionBodies", r.targetId)).catch(() => null),
      getDoc(doc(db, "questionOwners", r.targetId)).catch(() => null),
    ]);
    return {
      exists: q.exists(),
      excerpt: q.exists() ? `${q.data()!.title}\n${((body?.data()?.body as string) ?? "").slice(0, 80)}` : null,
      hidden: q.exists() ? q.data()!.visible === false : false,
      authorUid: (owner?.data()?.uid as string | undefined) ?? null,
      authorName: (q.data()?.author?.name as string | null) ?? null,
    };
  }
  const a = await getDoc(doc(db, "questions", r.questionId, "qaAnswers", r.targetId));
  return {
    exists: a.exists(),
    excerpt: a.exists() ? (a.data()!.body as string).slice(0, 120) : null,
    hidden: a.exists() ? a.data()!.status === "hidden" : false,
    authorUid: (a.data()?.author?.id as string | null) ?? null,
    authorName: (a.data()?.author?.name as string | null) ?? null,
  };
}

function notice(db: Firestore, userId: string, message: string) {
  return setDoc(doc(collection(db, "notifications")), {
    userId,
    type: "system",
    questionId: null,
    answerId: null,
    message,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

export async function handleReport(db: Firestore, r: QaReport, act: ReportAction, authorUid: string | null) {
  if (act === "hide") {
    if (r.targetType === "question") await updateDoc(doc(db, "questions", r.targetId), { status: "hidden", visible: false });
    else await updateDoc(doc(db, "questions", r.questionId, "qaAnswers", r.targetId), { status: "hidden" });
    if (authorUid) await notice(db, authorUid, "あなたの投稿は、運営が内容を確認したため非表示になりました。");
  } else if (act === "delete") {
    if (authorUid) await notice(db, authorUid, "あなたの投稿は、運営が内容を確認したため削除されました。");
    if (r.targetType === "question") {
      const answers = await getDocs(collection(db, "questions", r.targetId, "qaAnswers"));
      const b = writeBatch(db);
      answers.docs.forEach((d) => b.delete(d.ref));
      b.delete(doc(db, "questions", r.targetId));
      b.delete(doc(db, "questionBodies", r.targetId));
      b.delete(doc(db, "questionOwners", r.targetId));
      await b.commit();
    } else {
      const b = writeBatch(db);
      b.delete(doc(db, "questions", r.questionId, "qaAnswers", r.targetId));
      b.update(doc(db, "questions", r.questionId), { answerCount: increment(-1) });
      await b.commit();
    }
  } else if (act === "warn") {
    if (authorUid) await notice(db, authorUid, "運営からのお知らせです。投稿の内容を見直して、コミュニティガイドラインを確認してください。");
  } else if (act === "suspend") {
    if (authorUid) await updateDoc(doc(db, "profiles", authorUid), { isSuspended: true });
  }
  await updateDoc(doc(db, "qaReports", r.id), { status: act === "dismiss" ? "dismissed" : "resolved" });
}

export async function setSuspended(db: Firestore, uid: string, flag: boolean) {
  await updateDoc(doc(db, "profiles", uid), { isSuspended: flag });
}

/** カテゴリを初期値で登録する（qaCategories が空のとき） */
export async function seedCategories(db: Firestore) {
  const b = writeBatch(db);
  defaultCategories.forEach((c) => b.set(doc(db, "qaCategories", c.slug), { name: c.name, sortOrder: c.sortOrder, isActive: true }));
  await b.commit();
}

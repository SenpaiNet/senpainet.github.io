// Firestore への書き込み。セキュリティルール（firestore.rules）の前提に合わせて、
// 1つの操作に必要な書き込みを同じバッチ／トランザクションにまとめる。
// アプリとルールのテスト（tests/firestore.rules.test.ts）の両方から使う。
import {
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { Author, QaAnswer, QaProfile } from "./types";

export function authorOf(uid: string, p: QaProfile, anonymous: boolean): Author {
  return {
    id: anonymous ? null : uid,
    name: anonymous ? null : p.displayName,
    role: p.role,
    entryYear: p.entryYear ?? null,
    stream: p.stream ?? null,
    clubType: p.clubType ?? null,
    universityYear: p.universityYear ?? null,
  };
}

export type ProfileInput = Omit<QaProfile, "isSuspended" | "lastPostAt" | "createdAt" | "updatedAt"> & {
  /** 大学名（公開しない設定でも本人用に保存する） */
  privateUniversityName: string | null;
};

/** プロフィールの作成・更新。大学名を公開しない場合は private/info にだけ保存する */
export async function saveProfile(db: Firestore, uid: string, input: ProfileInput, exists: boolean) {
  const { privateUniversityName, ...rest } = input;
  const data = {
    ...rest,
    universityName: input.universityNamePublic ? privateUniversityName : null,
    updatedAt: serverTimestamp(),
    ...(exists ? {} : { isSuspended: false, createdAt: serverTimestamp() }),
  };
  const batch = writeBatch(db);
  batch.set(doc(db, "profiles", uid), data, { merge: true });
  batch.set(doc(db, "profiles", uid, "private", "info"), { universityName: privateUniversityName }, { merge: true });
  await batch.commit();
}

export type QuestionInput = {
  title: string;
  body: string;
  categories: string[];
  isAnonymous: boolean;
  targetStream: string | null;
  targetPathType: string | null;
  targetClubType: string | null;
};

/** 相談を投稿する。本文・投稿者記録・連投制限の時刻を同じバッチで書く */
export async function createQuestion(db: Firestore, uid: string, profile: QaProfile, input: QuestionInput) {
  const qRef = doc(collection(db, "questions"));
  const batch = writeBatch(db);
  batch.set(qRef, {
    title: input.title,
    categories: input.categories,
    isAnonymous: input.isAnonymous,
    author: authorOf(uid, profile, input.isAnonymous),
    targetStream: input.targetStream,
    targetPathType: input.targetPathType,
    targetClubType: input.targetClubType,
    answerCount: 0,
    bestAnswerId: null,
    bestAnswerAuthorId: null,
    status: "open",
    visible: true,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "questionBodies", qRef.id), { body: input.body });
  batch.set(doc(db, "questionOwners", qRef.id), { uid, seenAnswerCount: 0, createdAt: serverTimestamp() });
  batch.update(doc(db, "profiles", uid), { lastPostAt: serverTimestamp() });
  await batch.commit();
  return qRef.id;
}

/** 回答する。回答数と最初の回答時刻を、最新の値を読んだうえで同じトランザクションで更新する */
export async function addAnswer(db: Firestore, uid: string, profile: QaProfile, questionId: string, body: string) {
  const qRef = doc(db, "questions", questionId);
  const aRef = doc(collection(db, "questions", questionId, "qaAnswers"));
  await runTransaction(db, async (tx) => {
    const q = await tx.get(qRef);
    if (!q.exists()) throw new Error("question not found");
    const count = (q.data().answerCount as number) ?? 0;
    tx.set(aRef, {
      body,
      author: authorOf(uid, profile, false),
      helpfulCount: 0,
      status: "visible",
      parentId: null,
      isAnonymous: false,
      createdAt: serverTimestamp(),
    });
    tx.update(qRef, {
      answerCount: count + 1,
      lastAnswerId: aRef.id,
      ...(count === 0 ? { firstAnswerAt: serverTimestamp() } : {}),
    });
    tx.update(doc(db, "profiles", uid), { lastPostAt: serverTimestamp() });
  });
  return aRef.id;
}

/** 「参考になった」を付ける／外す */
export async function setVote(db: Firestore, uid: string, questionId: string, answerId: string, on: boolean) {
  const aRef = doc(db, "questions", questionId, "qaAnswers", answerId);
  const vRef = doc(db, "questions", questionId, "qaAnswers", answerId, "qaVotes", uid);
  const batch = writeBatch(db);
  if (on) batch.set(vRef, { createdAt: serverTimestamp() });
  else batch.delete(vRef);
  batch.update(aRef, { helpfulCount: increment(on ? 1 : -1) });
  await batch.commit();
}

/** ベストアンサーを選ぶ。回答者に通知を送る（匿名の回答者には送れない） */
export async function pickBestAnswer(db: Firestore, questionId: string, answer: Pick<QaAnswer, "id" | "author">) {
  const batch = writeBatch(db);
  batch.update(doc(db, "questions", questionId), {
    bestAnswerId: answer.id,
    bestAnswerAuthorId: answer.author.id,
    status: "resolved",
  });
  if (answer.author.id) {
    batch.set(doc(collection(db, "notifications")), {
      userId: answer.author.id,
      type: "best_answer",
      questionId,
      answerId: answer.id,
      message: null,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

/** 自分の相談の回答を読んだことにする（マイページの未読表示） */
export async function markQuestionSeen(db: Firestore, questionId: string, answerCount: number) {
  await updateDoc(doc(db, "questionOwners", questionId), { seenAnswerCount: answerCount });
}

export async function reportTarget(
  db: Firestore,
  uid: string,
  r: { targetType: "question" | "answer"; targetId: string; questionId: string; reason: string; detail: string | null },
) {
  await setDoc(doc(collection(db, "qaReports")), {
    reporterId: uid,
    ...r,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function markNotificationsRead(db: Firestore, ids: string[]) {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, "notifications", id), { isRead: true }));
  await batch.commit();
}

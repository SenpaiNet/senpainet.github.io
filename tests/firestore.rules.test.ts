// Firestore セキュリティルールのテスト。エミュレーターで動かす：
//   npm run test:rules
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { addAnswer, authorOf, createQuestion, pickBestAnswer, reportTarget, setVote } from "../lib/qa/writes";
import type { QaProfile } from "../lib/qa/types";

let env: RulesTestEnvironment;

const baseProfile = (over: Partial<QaProfile> = {}): QaProfile => ({
  displayName: "テスト",
  bio: null,
  role: "student",
  entryYear: 2023,
  graduationYear: null,
  stream: "science",
  clubType: "sports",
  clubName: null,
  pathType: null,
  universityName: null,
  universityNamePublic: true,
  faculty: null,
  universityYear: null,
  isAccepting: true,
  isPublic: true,
  isProfileComplete: true,
  isSuspended: false,
  categories: [],
  ...over,
});

const users = {
  asker: { uid: "asker", email: "asker@example.ed.jp" },
  senpai: { uid: "senpai", email: "senpai@example.ed.jp" },
  other: { uid: "other", email: "other@example.ed.jp" },
  newbie: { uid: "newbie", email: "newbie@example.ed.jp" },
  admin: { uid: "admin", email: "admin@example.ed.jp" },
};

function db(u: { uid: string; email: string } | null, opts: { verified?: boolean; provider?: string } = {}): Firestore {
  if (!u) return env.unauthenticatedContext().firestore() as unknown as Firestore;
  return env
    .authenticatedContext(u.uid, {
      email: u.email,
      email_verified: opts.verified ?? true,
      firebase: { sign_in_provider: (opts.provider ?? "password") as "password" },
    })
    .firestore() as unknown as Firestore;
}

async function seed(fn: (db: Firestore) => Promise<void>) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore() as unknown as Firestore));
}

const profiles: Record<string, QaProfile> = {
  asker: baseProfile({ displayName: "あすか" }),
  senpai: baseProfile({ displayName: "せんぱい", role: "alumni", entryYear: 2015, universityYear: 2 }),
  other: baseProfile({ displayName: "ほか" }),
  admin: baseProfile({ displayName: "運営" }),
};

const qInput = (title = "理系か文系か") => ({
  title,
  body: "本文です",
  categories: ["shinro"],
  isAnonymous: false,
  targetStream: null,
  targetPathType: null,
  targetClubType: null,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "senpainet-console",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (d) => {
    for (const [uid, p] of Object.entries(profiles)) await setDoc(doc(d, "profiles", uid), p);
    await setDoc(doc(d, "admins", users.admin.email), { allowed: true });
  });
});

/** 連投制限（20秒）をテストで回避するため、前回投稿時刻を過去にする */
async function rewindPost(uid: string) {
  await seed(async (d) => updateDoc(doc(d, "profiles", uid), { lastPostAt: Timestamp.fromMillis(Date.now() - 60_000) }));
}

async function newQuestion(anonymous = false) {
  const id = await createQuestion(db(users.asker), "asker", profiles.asker, { ...qInput(), isAnonymous: anonymous });
  await rewindPost("asker");
  return id;
}

describe("プロフィール", () => {
  it("本人は作れる。凍結フラグを立てて作ることはできない", async () => {
    await assertSucceeds(setDoc(doc(db(users.newbie), "profiles", "newbie"), baseProfile({ isProfileComplete: false })));
    await env.clearFirestore();
    await assertFails(setDoc(doc(db(users.newbie), "profiles", "newbie"), baseProfile({ isSuspended: true })));
  });
  it("他人のプロフィールは作れない", async () => {
    await assertFails(setDoc(doc(db(users.newbie), "profiles", "other2"), baseProfile()));
  });
  it("完成後は在校生⇔卒業生を変えられない。凍結の解除もできない", async () => {
    await assertFails(updateDoc(doc(db(users.asker), "profiles", "asker"), { role: "alumni" }));
    await seed(async (d) => updateDoc(doc(d, "profiles", "other"), { isSuspended: true }));
    await assertFails(updateDoc(doc(db(users.other), "profiles", "other"), { isSuspended: false }));
  });
  it("学校ドメインの制限", async () => {
    await seed(async (d) => setDoc(doc(d, "config", "qaSettings"), { allowedEmailDomain: "school.ed.jp" }));
    await assertFails(setDoc(doc(db(users.newbie), "profiles", "newbie"), baseProfile()));
    const ok = { uid: "ok", email: "ok@school.ed.jp" };
    await assertSucceeds(setDoc(doc(db(ok), "profiles", "ok"), baseProfile()));
  });
  it("非公開プロフィールは他人から読めない", async () => {
    await seed(async (d) => updateDoc(doc(d, "profiles", "senpai"), { isPublic: false }));
    await assertFails(getDoc(doc(db(users.other), "profiles", "senpai")));
    await assertSucceeds(getDoc(doc(db(users.other), "profiles", "asker")));
    await assertFails(getDoc(doc(db(null), "profiles", "asker")));
  });
});

describe("相談の投稿", () => {
  it("プロフィール完成済みなら投稿できる", async () => {
    await assertSucceeds(createQuestion(db(users.asker), "asker", profiles.asker, qInput()));
  });
  it("プロフィール未完成・メール未確認では投稿できない", async () => {
    await seed(async (d) => setDoc(doc(d, "profiles", "newbie"), baseProfile({ isProfileComplete: false })));
    await assertFails(createQuestion(db(users.newbie), "newbie", profiles.asker, qInput()));
    await assertFails(createQuestion(db(users.asker, { verified: false }), "asker", profiles.asker, qInput()));
  });
  it("Google ログインはメール確認済みとして扱う", async () => {
    await assertSucceeds(
      createQuestion(db(users.asker, { verified: false, provider: "google.com" }), "asker", profiles.asker, qInput()),
    );
  });
  it("20秒以内の連続投稿はできない", async () => {
    await assertSucceeds(createQuestion(db(users.asker), "asker", profiles.asker, qInput("1件目")));
    await assertFails(createQuestion(db(users.asker), "asker", profiles.asker, qInput("2件目")));
  });
  it("投稿者の情報を偽れない（他人の id・違う役割）", async () => {
    const d = db(users.asker);
    const qRef = doc(collection(d, "questions"));
    const fake = (author: object) => {
      const b = writeBatch(d);
      b.set(qRef, {
        title: "x", categories: ["shinro"], isAnonymous: false, targetStream: null, targetPathType: null,
        targetClubType: null, author, answerCount: 0, bestAnswerId: null, bestAnswerAuthorId: null,
        status: "open", visible: true, createdAt: serverTimestamp(),
      });
      b.set(doc(d, "questionBodies", qRef.id), { body: "x" });
      b.set(doc(d, "questionOwners", qRef.id), { uid: "asker", seenAnswerCount: 0, createdAt: serverTimestamp() });
      b.update(doc(d, "profiles", "asker"), { lastPostAt: serverTimestamp() });
      return b.commit();
    };
    const good = authorOf("asker", profiles.asker, false);
    await assertFails(fake({ ...good, id: "senpai" }));
    await assertFails(fake({ ...good, role: "alumni" }));
    await assertSucceeds(fake(good)); // 同じ手順でも、正しい情報なら通る
  });
  it("投稿者記録なしで相談だけを作ることはできない", async () => {
    const d = db(users.asker);
    await assertFails(
      setDoc(doc(collection(d, "questions")), {
        title: "x", categories: ["shinro"], isAnonymous: true, author: authorOf("asker", profiles.asker, true),
        targetStream: null, targetPathType: null, targetClubType: null, answerCount: 0, bestAnswerId: null,
        bestAnswerAuthorId: null, status: "open", visible: true, createdAt: serverTimestamp(),
      }),
    );
  });
});

describe("相談の閲覧と匿名", () => {
  it("未ログインでも相談の一覧（タイトル）は読めるが、本文は読めない", async () => {
    const id = await newQuestion();
    await assertSucceeds(getDocs(query(collection(db(null), "questions"), where("visible", "==", true))));
    await assertFails(getDoc(doc(db(null), "questionBodies", id)));
    await assertSucceeds(getDoc(doc(db(users.other), "questionBodies", id)));
  });
  it("匿名の相談の投稿者は、他人にはたどれない", async () => {
    const id = await newQuestion(true);
    const q = await getDoc(doc(db(users.other), "questions", id));
    expect(q.data()?.author.id).toBeNull();
    expect(q.data()?.author.name).toBeNull();
    await assertFails(getDoc(doc(db(users.other), "questionOwners", id)));
    await assertSucceeds(getDoc(doc(db(users.asker), "questionOwners", id)));
    await assertSucceeds(getDocs(query(collection(db(users.asker), "questionOwners"), where("uid", "==", "asker"))));
  });
  it("非表示の相談は他人から読めない（本人と運営は読める）", async () => {
    const id = await newQuestion();
    await updateDoc(doc(db(users.admin), "questions", id), { status: "hidden", visible: false });
    await assertFails(getDoc(doc(db(users.other), "questions", id)));
    await assertFails(getDoc(doc(db(users.other), "questionBodies", id)));
    await assertSucceeds(getDoc(doc(db(users.asker), "questions", id)));
  });
});

describe("回答・参考になった・ベストアンサー", () => {
  it("回答すると回答数が増え、最初の回答時刻が入る", async () => {
    const id = await newQuestion();
    await assertSucceeds(addAnswer(db(users.senpai), "senpai", profiles.senpai, id, "回答です"));
    const q = (await getDoc(doc(db(users.other), "questions", id))).data()!;
    expect(q.answerCount).toBe(1);
    expect(q.firstAnswerAt).toBeTruthy();
  });
  it("回答数を増やさずに回答だけ書く・回答数だけ書き換える、はできない", async () => {
    const id = await newQuestion();
    const d = db(users.senpai);
    await assertFails(
      setDoc(doc(collection(d, "questions", id, "qaAnswers")), {
        body: "x", author: authorOf("senpai", profiles.senpai, false), helpfulCount: 0, status: "visible",
        parentId: null, isAnonymous: false, createdAt: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(doc(d, "questions", id), { answerCount: 5 }));
  });
  it("未ログインは回答を読めない。凍結中は回答できない", async () => {
    const id = await newQuestion();
    await addAnswer(db(users.senpai), "senpai", profiles.senpai, id, "回答です");
    await assertFails(getDocs(query(collection(db(null), "questions", id, "qaAnswers"), where("status", "==", "visible"))));
    await seed(async (d) => updateDoc(doc(d, "profiles", "other"), { isSuspended: true }));
    await assertFails(addAnswer(db(users.other), "other", profiles.other, id, "x"));
  });
  it("参考になった：自分の回答には付けられない／1人1回／外せる", async () => {
    const id = await newQuestion();
    const aid = await addAnswer(db(users.senpai), "senpai", profiles.senpai, id, "回答です");
    await assertFails(setVote(db(users.senpai), "senpai", id, aid, true));
    await assertSucceeds(setVote(db(users.asker), "asker", id, aid, true));
    await assertFails(setVote(db(users.asker), "asker", id, aid, true));
    let a = (await getDoc(doc(db(users.other), "questions", id, "qaAnswers", aid))).data()!;
    expect(a.helpfulCount).toBe(1);
    await assertSucceeds(setVote(db(users.asker), "asker", id, aid, false));
    a = (await getDoc(doc(db(users.other), "questions", id, "qaAnswers", aid))).data()!;
    expect(a.helpfulCount).toBe(0);
    await assertFails(updateDoc(doc(db(users.other), "questions", id, "qaAnswers", aid), { helpfulCount: 99 }));
  });
  it("ベストアンサー：相談者だけが1回選べ、回答者に通知が届く", async () => {
    const id = await newQuestion(true);
    const aid = await addAnswer(db(users.senpai), "senpai", profiles.senpai, id, "回答です");
    const answer = { id: aid, author: authorOf("senpai", profiles.senpai, false) };
    await assertFails(pickBestAnswer(db(users.other), id, answer));
    await assertSucceeds(pickBestAnswer(db(users.asker), id, answer));
    const q = (await getDoc(doc(db(users.other), "questions", id))).data()!;
    expect(q.status).toBe("resolved");
    expect(q.bestAnswerAuthorId).toBe("senpai");
    const ns = await getDocs(query(collection(db(users.senpai), "notifications"), where("userId", "==", "senpai")));
    expect(ns.size).toBe(1);
    await assertFails(pickBestAnswer(db(users.asker), id, answer));
  });
  it("ベストアンサー以外の通知を他人に送ることはできない", async () => {
    await assertFails(
      setDoc(doc(collection(db(users.other), "notifications")), {
        userId: "senpai", type: "system", questionId: null, answerId: null, message: "x", isRead: false,
        createdAt: serverTimestamp(),
      }),
    );
  });
});

describe("通報と運営", () => {
  it("通報はでき、他人や本人は一覧を読めない。運営は読める", async () => {
    const id = await newQuestion();
    await assertSucceeds(
      reportTarget(db(users.other), "other", { targetType: "question", targetId: id, questionId: id, reason: "内容が不適切", detail: null }),
    );
    await assertFails(getDocs(collection(db(users.other), "qaReports")));
    await assertSucceeds(getDocs(collection(db(users.admin), "qaReports")));
  });
  it("メール未確認の人は、運営のメールアドレスを名乗っても運営にならない", async () => {
    const id = await newQuestion();
    const fakeAdmin = { uid: "fake", email: users.admin.email };
    await assertFails(updateDoc(doc(db(fakeAdmin, { verified: false }), "questions", id), { status: "hidden", visible: false }));
  });
  it("運営は凍結できる", async () => {
    await assertSucceeds(updateDoc(doc(db(users.admin), "profiles", "other"), { isSuspended: true }));
  });
});

describe("旧サイト（senpainet.github.io）のルールが変わっていないこと", () => {
  it("相談の公開読み取りと、未ログインでの投稿・回答", async () => {
    const d = db(null);
    await assertSucceeds(setDoc(doc(d, "consultations", "u_1"), { title: "旧サイトの相談", body: "本文" }));
    await assertSucceeds(getDoc(doc(d, "consultations", "u_1")));
    await assertSucceeds(setDoc(doc(collection(d, "consultations", "u_1", "answers")), { body: "旧サイトの回答" }));
  });
  it("Google ログインの運営は、旧サイトでも運営のまま", async () => {
    await seed(async (dd) => setDoc(doc(dd, "consultations", "u_2"), { title: "a", body: "b" }));
    await assertSucceeds(
      updateDoc(doc(db(users.admin, { provider: "google.com" }), "consultations", "u_2"), { hidden: true }),
    );
  });
});

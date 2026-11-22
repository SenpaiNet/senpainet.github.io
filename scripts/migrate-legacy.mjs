// 旧サイト（senpainet.github.io）のデータを、新サイトの形に写す。
//
//   node scripts/migrate-legacy.mjs            … 何をするかを表示するだけ（書き込まない）
//   node scripts/migrate-legacy.mjs --write    … 実際に書き込む
//
// ・旧データ（consultations / users など）は読むだけで、変更も削除もしない。
// ・新しい id は "legacy_" + 旧 id にするので、何度実行しても同じ結果になる（上書き）。
// ・profiles は、新サイトですでに作られている人のものは上書きしない。
// ・Admin SDK を使うので、セキュリティルールは関係しない。認証は次のどちらか：
//     gcloud auth application-default login   （senpainet-console に権限のあるアカウントで）
//     GOOGLE_APPLICATION_CREDENTIALS=サービスアカウントの鍵.json
//   FIRESTORE_EMULATOR_HOST を設定するとエミュレーターに対して動く（試し用）。
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");
const PROJECT_ID = process.env.GCLOUD_PROJECT || "senpainet-console";

initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: PROJECT_ID } : { credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

// ---- 旧サイトの約束ごと ----
// 「20回生が2026年度に中1」→ 入学年度 = 回生 + 2006（6年制なので卒業年度 = 入学年度 + 5）
const entryYearOf = (kaisei) => (Number.isFinite(kaisei) ? kaisei + 2006 : null);
const schoolYear = (ms) => {
  const d = new Date(ms + 9 * 3600 * 1000);
  return d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
};
const CATEGORY_MAP = { shinro: "jukenn", benkyo: "jugyou", gakko: "seikatsu", bukatsu: "bukatsu", ningen: "jinkan", career: "shushoku", other: "sonota" };
const TAG_MAP = {
  "受験・進路": "jukenn", "大学生活": "daigaku", "勉強法": "jugyou", "文系": "shinro", "理系": "shinro",
  "海外・留学": "ryugaku", "部活・課外活動": "bukatsu", "就活・インターン": "shushoku", "人間関係": "jinkan",
  "資格・語学": "shikaku", "一人暮らし": "daigaku", "医療・看護": "jukenn",
};
const DEFAULT_CATEGORIES = [
  ["jukenn", "受験・進路"], ["daigaku", "大学生活"], ["bukatsu", "部活動"], ["jugyou", "授業・勉強"], ["shinro", "文理選択"],
  ["ryugaku", "留学・国際"], ["shikaku", "資格・検定"], ["jinkan", "人間関係"], ["seikatsu", "学校生活"],
  ["shushoku", "就活・キャリア"], ["ib", "IB・課題研究"], ["sonota", "その他"],
];

const toMs = (v) => (typeof v === "number" ? v : v?.toMillis ? v.toMillis() : typeof v === "string" ? Date.parse(v) || null : null);
const ts = (ms) => Timestamp.fromMillis(ms ?? Date.now());
const categoriesOf = (c) => {
  const list = [CATEGORY_MAP[c.category], ...(Array.isArray(c.tags) ? c.tags.map((t) => TAG_MAP[t]) : [])].filter(Boolean);
  const uniq = [...new Set(list)].slice(0, 3);
  return uniq.length ? uniq : ["sonota"];
};
const streamOf = (tags = []) => (tags.includes("理系") ? "science" : tags.includes("文系") ? "humanities" : "undecided");

const out = { profiles: 0, profilesSkipped: 0, questions: 0, hiddenQuestions: 0, owners: 0, answers: 0, replies: 0 };
const writes = [];
const put = (ref, data) => writes.push([ref, data]);

// ---- ユーザー → profiles ----
const legacyUsers = await db.collection("users").get();
const nameOf = new Map();
for (const u of legacyUsers.docs) {
  const d = u.data();
  const kaisei = Number(d.kaisei);
  const entryYear = entryYearOf(kaisei);
  // 表示名はニックネームだけを使う。Google アカウントの名前（本名のことがある）は使わない
  const nickname = String(d.nickname || "").trim().slice(0, 20);
  nameOf.set(u.id, nickname || null);
  if ((await db.doc(`profiles/${u.id}`).get()).exists) {
    out.profilesSkipped++;
    continue;
  }
  const alumni = d.status === "grad" || (entryYear && schoolYear(Date.now()) - entryYear + 1 > 6);
  const complete = Boolean(entryYear && nickname && (d.status === "grad" || d.status === "current"));
  const univ = String(d.univ || "").trim().slice(0, 60) || null;
  const tags = Array.isArray(d.tags) ? d.tags : [];
  put(db.doc(`profiles/${u.id}`), {
    displayName: nickname || (alumni ? "卒業生" : "在校生"),
    bio: null,
    role: alumni ? "alumni" : "student",
    entryYear,
    graduationYear: alumni && entryYear ? entryYear + 5 : null,
    stream: streamOf(tags),
    clubType: null,
    clubName: null,
    pathType: alumni ? (univ ? "university" : null) : null,
    universityName: null, // 大学名は「公開しない」から始める（本人が新サイトで変えられる）
    universityNamePublic: false,
    faculty: String(d.faculty || "").trim().slice(0, 60) || null,
    universityYear: null,
    isAccepting: alumni,
    isPublic: true,
    // 在校生のまま6年を過ぎた人・情報が足りない人は、新サイトでプロフィール入力からやり直す
    isProfileComplete: complete && !(d.status === "current" && alumni),
    isSuspended: false,
    categories: [...new Set(tags.map((t) => TAG_MAP[t]).filter(Boolean))],
    createdAt: ts(toMs(d.createdAt) ?? toMs(d.updatedAt)),
    updatedAt: ts(Date.now()),
    legacy: true,
  });
  put(db.doc(`profiles/${u.id}/private/info`), { universityName: univ });
  out.profiles++;
}

// ---- 相談・回答・返信 ----
const owners = new Map((await db.collection("consultationOwners").get()).docs.map((d) => [d.id, d.data().uid]));
const answerOwners = new Map((await db.collection("answerOwners").get()).docs.map((d) => [d.id, d.data().uid]));
const consultations = await db.collection("consultations").get();

for (const c of consultations.docs) {
  const d = c.data();
  const qid = `legacy_${c.id}`;
  const postedMs = toMs(d.postedAt) ?? toMs(d.createdAt) ?? Date.now();
  const grade = Number(d.grade);
  const hidden = d.hidden === true;
  const answersSnap = await c.ref.collection("answers").get();
  let top = 0;
  let firstAnswerMs = null;

  for (const a of answersSnap.docs) {
    const ad = a.data();
    const aid = `legacy_${a.id}`;
    const uid = answerOwners.get(a.id) ?? null;
    const anon = ad.anon === true || !uid;
    const kaisei = Number(ad.kaisei);
    const createdMs = toMs(ad.createdAt) ?? postedMs;
    const entryYear = entryYearOf(kaisei);
    const role = entryYear && schoolYear(createdMs) - entryYear + 1 > 6 ? "alumni" : "student";
    put(db.doc(`questions/${qid}/qaAnswers/${aid}`), {
      body: String(ad.body || ""),
      author: { id: anon ? null : uid, name: anon ? null : nameOf.get(uid) ?? null, role, entryYear, stream: null, clubType: null, universityYear: null },
      helpfulCount: Number(ad.helpful) || 0,
      status: "visible",
      parentId: null,
      isAnonymous: anon,
      createdAt: ts(createdMs),
      legacyId: a.id,
    });
    top++;
    firstAnswerMs = firstAnswerMs === null ? createdMs : Math.min(firstAnswerMs, createdMs);
    out.answers++;

    // 返信は、その回答への返信として持つ（parentId つき）。回答数には数えない
    const replies = await a.ref.collection("replies").get();
    for (const r of replies.docs) {
      const rd = r.data();
      const rk = Number(rd.kaisei);
      const rEntry = entryYearOf(rk);
      const rMs = toMs(rd.createdAt) ?? createdMs;
      put(db.doc(`questions/${qid}/qaAnswers/legacy_${r.id}`), {
        body: String(rd.body || ""),
        author: { id: null, name: null, role: rEntry && schoolYear(rMs) - rEntry + 1 > 6 ? "alumni" : "student", entryYear: rEntry, stream: null, clubType: null, universityYear: null },
        helpfulCount: 0,
        status: "visible",
        parentId: aid,
        isAnonymous: true,
        createdAt: ts(rMs),
        legacyId: r.id,
      });
      out.replies++;
    }
  }

  put(db.doc(`questions/${qid}`), {
    title: String(d.title || "（無題）").slice(0, 60),
    categories: categoriesOf(d),
    isAnonymous: true, // 旧サイトの相談は匿名（相談本体に投稿者を持たない）だったので、匿名のまま移す
    author: {
      id: null,
      name: null,
      role: "student",
      entryYear: Number.isFinite(grade) ? schoolYear(postedMs) - grade + 1 : null,
      stream: null,
      clubType: null,
      universityYear: null,
    },
    targetStream: null,
    targetPathType: null,
    targetClubType: null,
    answerCount: top,
    bestAnswerId: null,
    bestAnswerAuthorId: null,
    status: hidden ? "hidden" : "open",
    visible: !hidden,
    createdAt: ts(postedMs),
    firstAnswerAt: firstAnswerMs === null ? null : ts(firstAnswerMs),
    legacyId: c.id,
  });
  put(db.doc(`questionBodies/${qid}`), { body: String(d.body || "") });
  const owner = owners.get(c.id);
  if (owner) {
    put(db.doc(`questionOwners/${qid}`), { uid: owner, seenAnswerCount: top, createdAt: ts(postedMs) });
    out.owners++;
  }
  out.questions++;
  if (hidden) out.hiddenQuestions++;
}

// ---- カテゴリ（未登録なら初期値を入れる）----
const cats = await db.collection("qaCategories").limit(1).get();
if (cats.empty) {
  DEFAULT_CATEGORIES.forEach(([slug, name], i) => put(db.doc(`qaCategories/${slug}`), { name, sortOrder: i + 1, isActive: true }));
}

console.log(WRITE ? "書き込みます" : "確認のみ（書き込むには --write をつける）");
console.log(`  プロフィール：${out.profiles}件を作成（新サイトで作成済みのため ${out.profilesSkipped}件は上書きしない）`);
console.log(`  相談：${out.questions}件（うち非表示 ${out.hiddenQuestions}件、投稿者の記録あり ${out.owners}件）`);
console.log(`  回答：${out.answers}件、返信：${out.replies}件`);
console.log(`  カテゴリ：${cats.empty ? "初期の12種類を登録" : "登録済みのため変更なし"}`);
console.log(`  書き込み件数の合計：${writes.length}`);

if (WRITE) {
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    writes.slice(i, i + 400).forEach(([ref, data]) => batch.set(ref, data));
    await batch.commit();
  }
  console.log("完了しました。");
}

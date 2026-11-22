// 退会。サーバー処理を使わずにできる範囲で、ルールが許す操作だけを行う。
//  ・回答のない自分の相談 → 本文・投稿者記録ごと削除
//  ・回答のある自分の相談・自分の回答 → 匿名にして残す（回答してくれた人の書き込みを消さないため）
//  ・プロフィール・お知らせ → 削除
//  ・最後にログインのアカウントを削除
import { deleteUser, type User } from "firebase/auth";
import { collection, doc, getDocs, query, where, writeBatch, type Firestore } from "firebase/firestore";
import { answersBy, myQuestions } from "./reads";

export async function deleteAccount(db: Firestore, user: User) {
  const uid = user.uid;
  const mine = await myQuestions(db, uid);
  for (const { question } of mine) {
    const b = writeBatch(db);
    if (question.answerCount === 0) {
      b.delete(doc(db, "questions", question.id));
      b.delete(doc(db, "questionBodies", question.id));
      b.delete(doc(db, "questionOwners", question.id));
    } else if (!question.isAnonymous) {
      b.update(doc(db, "questions", question.id), {
        isAnonymous: true,
        author: { ...question.author, id: null, name: null },
      });
    }
    await b.commit();
  }

  const answers = await answersBy(db, uid, false, 500);
  for (let i = 0; i < answers.length; i += 400) {
    const b = writeBatch(db);
    answers.slice(i, i + 400).forEach((a) =>
      b.update(doc(db, "questions", a.questionId, "qaAnswers", a.id), {
        isAnonymous: true,
        author: { ...a.author, id: null, name: null },
      }),
    );
    await b.commit();
  }

  const ns = await getDocs(query(collection(db, "notifications"), where("userId", "==", uid)));
  const b = writeBatch(db);
  ns.docs.forEach((d) => b.delete(d.ref));
  b.delete(doc(db, "profiles", uid, "private", "info"));
  b.delete(doc(db, "profiles", uid));
  await b.commit();

  await deleteUser(user); // 最後のログインから時間が経っていると auth/requires-recent-login になる
}

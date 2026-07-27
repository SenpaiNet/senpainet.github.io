/**
 * SenpaiNet: タグ付き相談 → 該当分野の先輩へメール通知
 *
 * ▼ これは何をするか
 *   1. mailQueue にドキュメントが作られる（相談投稿時にクライアントが積む）
 *   2. その相談のタグと一致するタグを持つ senpaiProfiles を検索
 *   3. 各先輩あてのメールを mail コレクションに書き込む
 *      → Firebase 拡張機能「Trigger Email from Firestore」が実際に送信する
 *
 * ▼ 有効化に必要なこと（Firebase コンソール）
 *   1. プロジェクトを Blaze（従量課金）プランにアップグレード
 *      ※ Functions と拡張機能は Blaze が必須。無料枠があるため通常は課金されにくい。
 *   2. 拡張機能「Trigger Email from Firestore」をインストール
 *      - Email documents collection: mail
 *      - SMTP connection URI: 例) smtps://user:pass@smtp.gmail.com:465
 *        （SendGrid 等でも可。Gmail はアプリパスワードを使用）
 *   3. このディレクトリで:  firebase deploy --only functions
 *
 * ▼ プライバシー設計
 *   先輩のメールアドレスはクライアントから読めない（Firestore ルールで禁止）。
 *   マッチングと送信はこのサーバー側コードだけが行う。
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// 公開サイトのURL（メール本文のリンクに使用）
const SITE_URL = "https://senpainet.github.io/";

exports.notifySenpaiOnTaggedConsultation = onDocumentCreated(
  { document: "mailQueue/{queueId}", region: "asia-northeast1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const q = snap.data() || {};
    const tags = Array.isArray(q.tags) ? q.tags.slice(0, 10) : [];
    if (!tags.length) {
      await snap.ref.update({ status: "skipped", reason: "no-tags", processedAt: FieldValue.serverTimestamp() });
      return;
    }

    // タグが1つでも一致する先輩を検索（array-contains-any は最大10要素）
    const profSnap = await db
      .collection("senpaiProfiles")
      .where("tags", "array-contains-any", tags)
      .get();

    // 同じメールアドレスへの重複送信を防ぐ
    const seen = new Set();
    const recipients = [];
    profSnap.forEach((doc) => {
      const p = doc.data() || {};
      if (p.notify === false) return;                 // 通知を希望していない
      const email = (p.email || "").trim().toLowerCase();
      if (!email || seen.has(email)) return;
      seen.add(email);
      const matched = (p.tags || []).filter((t) => tags.includes(t));
      recipients.push({ email, matched });
    });

    if (!recipients.length) {
      await snap.ref.update({ status: "no-match", matchedCount: 0, processedAt: FieldValue.serverTimestamp() });
      return;
    }

    const title = q.title || "新しい相談";
    const link = SITE_URL + "#browse";

    // 1通ずつ mail コレクションへ（Trigger Email 拡張が送信する）
    const batch = db.batch();
    recipients.forEach((r) => {
      const ref = db.collection("mail").doc();
      const tagLine = r.matched.map((t) => "#" + t).join(" ");
      batch.set(ref, {
        to: [r.email],
        message: {
          subject: `【SenpaiNet】あなたの分野に新しい相談が届きました（${tagLine}）`,
          text:
            `後輩から、あなたが登録した分野の相談が届きました。\n\n` +
            `■ 相談タイトル\n${title}\n\n` +
            `■ 該当タグ\n${tagLine}\n\n` +
            `▼ 回答する\n${link}\n\n` +
            `※ 通知が不要な場合は、マイページの通知設定から変更できます。\n` +
            `SenpaiNet`,
          html:
            `<p>後輩から、あなたが登録した分野の相談が届きました。</p>` +
            `<p><strong>${escapeHtml(title)}</strong></p>` +
            `<p style="color:#2f73e8">${escapeHtml(tagLine)}</p>` +
            `<p><a href="${link}" style="display:inline-block;background:#2f73e8;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">回答する</a></p>` +
            `<p style="font-size:12px;color:#888">※ 通知が不要な場合は、マイページの通知設定から変更できます。<br>SenpaiNet</p>`,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    await snap.ref.update({
      status: "sent",
      matchedCount: recipients.length,
      processedAt: FieldValue.serverTimestamp(),
    });
  }
);

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

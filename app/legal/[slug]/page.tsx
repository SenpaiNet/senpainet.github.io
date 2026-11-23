import { notFound } from "next/navigation";
import { BackLink, PageBody, PageHeading } from "@/components/ui";

// テンプレートです。[ ] の部分と内容は、運営者が確認して差し替えてください。
type Doc = { title: string; en: string; lead: string; sections: { h: string; items: string[] }[] };

const docs: Record<string, Doc> = {
  terms: {
    title: "利用規約", en: "Terms",
    lead: "SenpaiNet（以下「本サイト」）を使うときのきまりです。登録した人は、この内容に同意したものとします。",
    sections: [
      { h: "使える人", items: ["中学生・高校生など学校に通っている人と、その卒業生です。", "登録するときは、自分のメールアドレスを使ってください。"] },
      { h: "してはいけないこと", items: ["ほかの人の名前、電話番号、SNSのアカウントなど、人が特定できる情報を書くこと。", "悪口、いやがらせ、差別につながる投稿。", "宣伝や、サイトと関係のない投稿。", "ほかの人になりすますこと。"] },
      { h: "投稿の扱い", items: ["投稿した相談と回答は、登録している在校生と卒業生が読めます。", "運営が不適切だと判断した投稿は、知らせたうえで非表示や削除にすることがあります。", "きまりを守れないときは、利用を止めることがあります。"] },
      { h: "回答について", items: ["回答は先輩一人ひとりの経験にもとづく意見です。進路の最終的な判断は、先生や保護者とも相談して自分で決めてください。"] },
      { h: "運営者・変更", items: ["運営者：[運営者名]", "この規約は、必要に応じて変更します。変更するときは、サイト上でお知らせします。"] },
    ],
  },
  privacy: {
    title: "プライバシーポリシー", en: "Privacy",
    lead: "本サイトが、あなたの情報をどう扱うかの説明です。",
    sections: [
      { h: "集める情報", items: ["メールアドレス、表示名、学年や文系・理系、部活、卒業生の進路などのプロフィール。", "投稿した相談、回答、「参考になった」、通報の内容。"] },
      { h: "使いみち", items: ["サイトの運営（登録、投稿の表示、お知らせ）のために使います。", "それ以外の目的では使いません。"] },
      { h: "ほかの人に見える情報", items: ["表示名、学年、文系・理系、部活は、投稿に添えて表示されます。匿名で投稿すると、表示名は出ません。", "大学名は、「見せない」設定にできます。", "プロフィールを「公開しない」設定にすることもできます。"] },
      { h: "第三者への提供", items: ["法令にもとづく場合を除き、本人の同意なく第三者に提供しません。", "データの保管と認証には [委託先：Supabase など] を使っています。"] },
      { h: "削除・問い合わせ", items: ["マイページの「退会」から、プロフィールと投稿をすべて消せます。", "ご質問は「お問い合わせ」からどうぞ。"] },
    ],
  },
  guidelines: {
    title: "コミュニティガイドライン", en: "Guidelines",
    lead: "みんなが安心して相談し、答えられる場所にするためのお願いです。",
    sections: [
      { h: "相談するとき", items: ["今の状況と、聞きたいことを具体的に書くと、答えてもらいやすくなります。", "友達や先生の名前、連絡先は書かないでください。聞きにくいことは匿名で投稿できます。"] },
      { h: "回答するとき", items: ["自分の経験をもとに、やさしく具体的に書いてください。", "「こうするべき」と決めつけず、選び方のヒントを伝えましょう。", "医療や心の不調など、専門の助けが必要そうな相談は、先生や専門の窓口につなぎましょう。"] },
      { h: "困ったとき", items: ["いやな投稿を見つけたら、「通報する」から運営に知らせてください。", "運営が内容を確認し、必要なときは非表示や削除、警告、利用停止をします。"] },
    ],
  },
  contact: {
    title: "お問い合わせ", en: "Contact",
    lead: "サイトの使い方、不具合、投稿についてのご相談はこちらです。",
    sections: [
      { h: "連絡先", items: ["メール：[連絡先メールアドレス]", "運営者：[運営者名]", "返信まで数日かかることがあります。"] },
      { h: "お願い", items: ["投稿についてのご連絡は、相談のタイトルと日付を書いてください。", "緊急の場合や心配なことがあるときは、学校の先生や身近な大人にも相談してください。"] },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(docs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `${docs[slug]?.title ?? ""} | SenpaiNet` };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = docs[slug];
  if (!d) notFound();
  return (
    <PageBody>
      <BackLink href="/">トップに戻る</BackLink>
      <PageHeading label={d.title} en={d.en} lead={d.lead} />
      <div className="flex flex-col gap-8 rounded-lg bg-surface p-6 shadow-card md:p-10">
        {d.sections.map((s) => (
          <section key={s.h} className="flex flex-col gap-3">
            <h2 className="text-h3">{s.h}</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </section>
        ))}
        <p className="border-t border-line pt-4 text-caption text-ink-muted">制定日：[年月日]</p>
      </div>
    </PageBody>
  );
}

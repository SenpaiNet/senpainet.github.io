import { KineticWord } from "@/components/motion/Kinetic";
import Link from "next/link";
import { ArrowRight, Clock, EyeOff, Plus, Users } from "lucide-react";
import { Scrolly } from "@/components/landing/Scrolly";
import { CategoryLinks, CtaButton, LatestQuestions, Numbers } from "@/components/landing/LandingLive";

const eyebrow = "text-label";
const display = "font-display text-display-xl text-brand";
const sectionPad = "mx-auto max-w-page px-6 md:px-12";

const about = [
  { icon: EyeOff, title: "名前を出さずに相談できる", body: "匿名で投稿すると、表示されるのは「在校生・学年」だけ。聞きにくいことも気軽に書けます。" },
  { icon: Users, title: "同じ学校の先輩だけ", body: "登録できるのはTGUISSの在校生と卒業生だけ。同じ授業や行事を経験した人が答えます。" },
  { icon: Clock, title: "卒業してもつながる", body: "6年生は卒業と同時に自動で「先輩」に。今度はあなたが後輩の相談に答える番です。" },
] as const;

const senpai = [
  { meta: "卒業生・大学[ ]回生・理系", tags: ["受験・進路", "大学生活"] },
  { meta: "卒業生・大学[ ]回生・文系", tags: ["留学・国際", "IB・課題研究"] },
  { meta: "卒業生・社会人", tags: ["就活・キャリア", "部活動"] },
];

const flow = [
  { num: "Step 01", title: "プロフィールを作って登録する", body: "学年、文系・理系、部活などを入力します。卒業生は大学の何回生かも登録します。", bg: "bg-surface-sky" },
  { num: "Step 02", title: "相談を投稿する", body: "タイトルと内容を書き、カテゴリを3つまで選びます。匿名で投稿することもできます。", bg: "bg-surface-periwinkle" },
  { num: "Step 03", title: "先輩たちから回答が届く", body: "いろいろな先輩が答えてくれます。いちばん役に立った回答を「ベストアンサー」に選びましょう。", bg: "bg-surface-sky" },
];

const faqs = [
  { q: "相談した内容は誰に見られますか", a: "SenpaiNetに登録している在校生と卒業生だけが読めます。登録していない人には、相談のタイトルとカテゴリだけが表示されます。" },
  { q: "名前を出さずに相談できますか", a: "できます。投稿するときに「匿名で投稿する」を選ぶと、表示名は出ず「在校生・学年」だけが表示されます。" },
  { q: "卒業したらアカウントはどうなりますか", a: "6年生は4月1日に自動で「卒業生」に切り替わります。そのあと大学や進路の情報を入力すると、先輩として回答できるようになります。" },
  { q: "困った投稿を見つけたら", a: "各投稿と回答にある「通報する」から運営に知らせてください。内容を確認し、必要に応じて非表示にします。" },
];

function Heading({ label, en, color = "text-brand" }: { label: string; en: string; color?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={`${eyebrow} ${color}`}>{label}</p>
      <KineticWord text={en} className={`font-display text-display-xl ${color}`} />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Scrolly />

      <section id="about" className={`${sectionPad} py-24`}>
        <div className="flex flex-col gap-8 rounded-lg bg-surface-periwinkle p-6 md:p-12">
          <div className="flex flex-col gap-2">
            <p className={`${eyebrow} text-ink`}>安心して相談できる理由</p>
            <KineticWord text="About" className="font-display text-display-xl text-ink" />
            <h2 className="mt-2 text-h2">進路の悩みを、経験者に。</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {about.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-[1_1_260px] flex-col gap-3 rounded-md bg-surface p-6 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-brand-soft text-brand"><Icon size={22} strokeWidth={1.75} aria-hidden="true" /></span>
                <h3 className="text-card-title">{title}</h3>
                <p className="text-body-sm">{body}</p>
              </div>
            ))}
          </div>
          <CategoryLinks />
        </div>
      </section>

      <section className={`${sectionPad} flex flex-col gap-8 pb-24`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Heading label="先輩紹介" en="Senpai" />
          <Link href="/board" className="inline-flex min-h-[44px] items-center gap-1.5 text-label text-brand-deep">先輩を探す<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link>
        </div>
        {/* 先輩のメッセージは本人の言葉のまま載せる。収集が済むまでは空欄表示 */}
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {senpai.map((s) => (
            <div key={s.meta} className="flex flex-col gap-3.5 rounded-md border border-line bg-surface p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-pill bg-brand-soft text-brand"><Users size={24} strokeWidth={1.75} aria-hidden="true" /></span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-heading text-card-title font-bold">[先輩の名前]</span>
                  <span className="text-caption text-ink-muted">{s.meta}</span>
                </div>
              </div>
              <p className="text-body-sm">[先輩からのひとこと。本人の言葉のまま載せます]</p>
              <span className="flex flex-wrap gap-1.5">{s.tags.map((t) => <span key={t} className="rounded-pill bg-brand-soft px-2.5 py-[3px] text-caption font-bold text-brand-deep">#{t}</span>)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface-soft">
        <div className={`${sectionPad} flex flex-col gap-8 py-24`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Heading label="新着の相談" en="Latest" />
            <Link href="/board" className="inline-flex min-h-[44px] items-center gap-1.5 text-label text-brand-deep">相談をもっと見る<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link>
          </div>
          <LatestQuestions />
        </div>
      </section>

      <Numbers heading={<Heading label="数字で見るSenpaiNet" en="Numbers" />} />

      <section id="flow" className={`${sectionPad} flex flex-col gap-8 py-24`}>
        <Heading label="使い方" en="Flow" />
        <div className="flex flex-col gap-4">
          {flow.map((s) => (
            <div key={s.num} className={`flex flex-wrap items-center gap-6 rounded-lg px-6 py-6 md:px-12 md:py-10 ${s.bg}`}>
              <p className="flex-[0_0_140px] font-display text-eyebrow text-ink">{s.num}</p>
              <div className="flex flex-[1_1_360px] flex-col gap-1">
                <h3 className="text-h3">{s.title}</h3>
                <p className="text-body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="bg-surface-soft">
        <div className={`${sectionPad} flex flex-col gap-8 py-24`}>
          <Heading label="よくある質問" en="FAQ" />
          <div className="flex flex-col gap-3">
            {faqs.map((f) => (
              <details key={f.q} className="sn-faq rounded-md bg-surface shadow-card">
                <summary className="flex min-h-[64px] items-center justify-between gap-4 px-6 font-heading text-card-title font-bold">
                  <span>{f.q}</span>
                  <Plus className="faq-plus flex-none text-brand transition-transform duration-200" size={20} strokeWidth={1.75} aria-hidden="true" />
                </summary>
                <p className="px-6 pb-6 text-body">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand">
        <div className={`${sectionPad} flex flex-wrap items-center justify-between gap-8 py-20`}>
          <div className="flex flex-col gap-2">
            <h2 className="text-h2 text-on-brand">その悩み、先輩に相談しよう</h2>
            <p className="text-on-brand">登録は無料です。在校生も卒業生も、学校のメールアドレスで登録できます。</p>
          </div>
          <CtaButton />
        </div>
      </section>
    </>
  );
}

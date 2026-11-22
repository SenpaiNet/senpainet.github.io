# SenpaiNet 構築プロンプト

> このファイルはコーディングAI（Claude Code / Cursor / v0 など）にそのまま貼り付けて使うための仕様プロンプトです。
> 「### 実装の進め方」まで読んだうえで、フェーズ1から順に実装してください。

---

## 0. 依頼の要約

高校（東京学芸大学附属国際中等教育学校 / TGUISS）のコミュニティ内で、**在校生が先輩（上級生・卒業生）に相談できるWebプラットフォーム「SenpaiNet」** を構築してください。

- ランディングページ（LP）と相談プラットフォームが**1つのサイトに統合**されている
- トップページ（`/`）= LP。SenpaiNetの紹介・使い方・登録導線
- 相談は Yahoo!知恵袋のように、**1件の相談に複数人が回答**できる
- 相談は **タイトル + 本文 + カテゴリ（ハッシュタグ形式で複数選択）** で投稿
- ユーザーは**プロフィールを作成したうえで登録**する（学年 / 理系・文系 / 運動部・文化部 / 卒業生は大学何回生 など）

キャッチコピー: **「その悩み、先輩に相談しよう」**

---

## 1. 技術スタック

GitHub Pages で運用中（senpainet.github.io）のため、**静的フロントエンド + BaaS** を基本とします。

### 推奨構成（デフォルトで採用）

| 層 | 技術 |
|---|---|
| フロントエンド | Next.js 14+ (App Router) / TypeScript / Tailwind CSS |
| 認証・DB・ストレージ | Supabase (Auth + Postgres + Row Level Security + Storage) |
| ホスティング | Vercel（推奨） もしくは `next export` による GitHub Pages 静的配信 |
| フォーム/バリデーション | React Hook Form + Zod |
| 状態管理 | Server Components 中心、クライアント状態は最小限（Zustand 等は不要） |

### GitHub Pages を継続する場合の代替構成

- Vite + React + TypeScript の SPA（`gh-pages` ブランチへデプロイ）
- Supabase を JS クライアントから直接呼ぶ（サーバー不要）
- ルーティングは HashRouter、または 404.html リダイレクトトリックを使用
- **この場合、秘密鍵は一切フロントに置かない。anon key + RLS のみで完結させること**

> どちらの構成にするかは最初に明示して確認してください。未指定なら推奨構成で進めてください。

---

## 2. ユーザー種別とプロフィール

### 2.1 ユーザー区分

| 区分 | 説明 |
|---|---|
| `student` | 在校生（1〜6年生。中等教育学校のため6学年制） |
| `alumni` | 卒業生 |
| `admin` | 運営（モデレーション権限） |

**自動進級・自動卒業フロー**
- プロフィールには「入学年度（`entry_year`）」を保存し、学年は入学年度と現在日付から算出する（毎年4月1日で繰り上がる）
- 6年生が4月1日を迎えたら自動的に `alumni` に遷移し、`graduation_year` を確定させる
- 卒業遷移時に「大学・進路情報を入力してください」というオンボーディングを表示する

### 2.2 プロフィール項目

**共通**
- 表示名（ニックネーム可、本名必須ではない）
- アバター（任意・Supabase Storage）
- 自己紹介（200字以内）
- 文理区分: `理系` / `文系` / `未定・どちらも`
- 部活区分: `運動部` / `文化部` / `同好会・その他` / `所属なし`
- 部活名（任意、自由入力）
- 回答が得意なカテゴリ（複数選択、カテゴリマスタから）
- 公開範囲設定（プロフィールを他ユーザーに見せるか）

**在校生のみ**
- 入学年度 → 学年を自動算出（1〜6年）

**卒業生のみ**
- 卒業年度
- 進路種別: `大学` / `大学院` / `専門学校` / `就職` / `浪人・受験中` / `その他`
- 大学名（任意・非公開設定可）
- 学部・学科（任意）
- **大学何回生**（1〜6、または「卒業済み・社会人」）
- 現在の職種・業界（社会人の場合、任意）
- 相談を受け付けるか（`is_accepting` フラグ）

### 2.3 登録フロー

1. メールアドレスで新規登録（Supabase Auth / Magic Link もしくはパスワード）
   - **学校ドメインのメールアドレスのみ許可**するオプションを設定ファイルで切り替えられるようにする
2. メール認証
3. **プロフィール作成（必須・スキップ不可）** — 区分選択 → 区分ごとの項目入力 → 完了
4. プロフィール未完成のユーザーは `/onboarding` にリダイレクトされ、相談投稿・回答ができない

---

## 3. カテゴリ（ハッシュタグ）

カテゴリはマスタテーブルで管理し、投稿時に**最大3つまで選択**（最低1つ必須）。UIはハッシュタグチップ形式。

初期カテゴリ（`slug` / 表示名）:

```
jukenn        受験・進路
daigaku       大学生活
bukatsu       部活動
jugyou        授業・勉強
shinro        文理選択
ryugaku       留学・国際
shikaku       資格・検定
jinkan        人間関係
seikatsu      学校生活
shushoku      就活・キャリア
ib            IB・課題研究
sonota        その他
```

- 管理者はカテゴリを追加・編集・非表示にできる
- カテゴリ別一覧ページ `/board?category=jukenn` を持つ
- 将来的に自由タグを追加できるようスキーマを設計しておく（`tags` テーブルを別途用意しても良い）

---

## 4. 画面仕様

### 4.1 `/` — ランディングページ（未ログイン時のトップ）

セクション構成:

1. **ヒーロー**
   - キャッチコピー「その悩み、先輩に相談しよう」
   - サブコピー（例: 同じ学校を歩いた先輩が、あなたの進路と毎日に答えます）
   - CTA: 「相談してみる」「先輩として登録する」
2. **SenpaiNetとは** — 3つの価値（匿名で聞ける / 同じ学校の先輩だけ / 卒業後もつながる）をアイコン付きで
3. **使い方** — 3ステップ（登録 → 相談を投稿 → 先輩から回答が届く）
4. **新着の相談** — 直近の相談を3〜6件カード表示（本文は冒頭のみ、クリックで詳細。未ログインなら登録を促す）
5. **数字で見るSenpaiNet** — 登録者数 / 相談数 / 回答率 / 平均初回回答時間（DBから動的取得、0件時は非表示）
6. **よくある質問**（匿名性、誰が見られるか、卒業後の扱い、通報の仕組み）
7. **フッター** — 運営者情報、プライバシーポリシー、利用規約、問い合わせ

ログイン済みユーザーが `/` を開いた場合は、ヒーローを簡略化して**相談ボードへの導線とマイページ通知を上部に表示**する（完全な別ページにはしない）。

### 4.2 `/board` — 相談一覧

- カード一覧（タイトル / 冒頭2行 / カテゴリチップ / 投稿者の属性ラベル / 回答数 / 投稿日時 / 解決済みバッジ）
- 投稿者は「高2・文系・運動部」のように**属性のみ表示**（匿名投稿時は「在校生」のみ）
- フィルタ: カテゴリ、未回答のみ、解決済みを除く、投稿者区分
- ソート: 新着順 / 回答が多い順 / 未回答優先
- 検索（タイトル・本文の全文検索。Postgres の `tsvector` もしくは `ILIKE`）
- ページネーションまたは無限スクロール

### 4.3 `/board/new` — 相談投稿

- タイトル（必須・60字以内）
- 本文（必須・2000字以内、Markdown は使わずプレーンテキスト + 改行保持で十分）
- カテゴリ選択（チップ式、1〜3個）
- 匿名で投稿するチェックボックス（デフォルト: オフ。オンでも属性ラベルは表示）
- 「どんな先輩に答えてほしいか」任意指定（文理 / 進路種別 / 部活区分）
- **投稿前の注意喚起**: 個人名・連絡先・特定の教員名などを書かないよう促すモーダルまたはインライン警告
- 下書き保存（localStorage で可）

### 4.4 `/board/[id]` — 相談詳細

- 相談本文、カテゴリ、投稿者属性、投稿日時
- 回答一覧（投稿順 / 参考になった順で切替）
  - 各回答: 本文、回答者の属性（「卒業生・大学2回生・理系」など）、投稿日時
  - 「参考になった」ボタン（1ユーザー1回、トグル）
  - **ベストアンサー**: 相談投稿者のみ1件選択可。選ぶと相談は「解決済み」になり、回答は最上部に固定
- 回答フォーム（ログイン済み・プロフィール完成済みのみ）
- 回答への返信（1階層のみ。深いスレッドは作らない）
- 通報ボタン（相談・回答それぞれ）

### 4.5 `/profile/[id]` — プロフィール公開ページ

- 属性、自己紹介、得意カテゴリ
- その人の回答一覧、ベストアンサー獲得数
- 「この先輩に相談する」ボタン（カテゴリを事前選択した状態で投稿画面へ）

### 4.6 `/mypage` — マイページ

- 自分の相談一覧（回答が付いたものに未読バッジ）
- 自分の回答一覧
- 通知一覧（自分の相談への回答、ベストアンサー選出、返信）
- プロフィール編集
- 退会

### 4.7 `/admin` — 管理画面（adminのみ）

- 通報一覧と対応（非表示化 / 削除 / ユーザー警告 / 凍結）
- ユーザー一覧
- カテゴリ管理
- 基本統計

---

## 5. データモデル（Supabase / Postgres）

```sql
-- プロフィール（auth.users と 1:1）
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text check (char_length(bio) <= 200),
  role text not null default 'student' check (role in ('student','alumni','admin')),
  entry_year int,                 -- 在校生: 入学年度
  graduation_year int,            -- 卒業生: 卒業年度
  stream text check (stream in ('science','humanities','undecided')),
  club_type text check (club_type in ('sports','culture','other','none')),
  club_name text,
  -- 卒業生用
  path_type text check (path_type in ('university','grad_school','vocational','employed','exam','other')),
  university_name text,
  faculty text,
  university_year int,            -- 大学何回生 (1-6, 7=卒業済み)
  occupation text,
  is_accepting boolean not null default true,
  is_profile_complete boolean not null default false,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id serial primary key,
  slug text unique not null,
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- 得意カテゴリ
create table profile_categories (
  profile_id uuid references profiles on delete cascade,
  category_id int references categories on delete cascade,
  primary key (profile_id, category_id)
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles on delete cascade,
  title text not null check (char_length(title) <= 60),
  body text not null check (char_length(body) <= 2000),
  is_anonymous boolean not null default false,
  target_stream text,             -- 希望する回答者の属性（任意）
  target_path_type text,
  target_club_type text,
  best_answer_id uuid,            -- 解決済みフラグも兼ねる
  answer_count int not null default 0,
  view_count int not null default 0,
  status text not null default 'open' check (status in ('open','resolved','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table question_categories (
  question_id uuid references questions on delete cascade,
  category_id int references categories on delete cascade,
  primary key (question_id, category_id)
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions on delete cascade,
  author_id uuid not null references profiles on delete cascade,
  parent_id uuid references answers on delete cascade,  -- 返信用（1階層のみ）
  body text not null check (char_length(body) <= 2000),
  is_anonymous boolean not null default false,
  helpful_count int not null default 0,
  status text not null default 'visible' check (status in ('visible','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table answer_votes (
  answer_id uuid references answers on delete cascade,
  user_id uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles on delete cascade,
  target_type text not null check (target_type in ('question','answer','profile')),
  target_id uuid not null,
  reason text not null,
  detail text,
  status text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null,             -- 'new_answer' | 'best_answer' | 'reply' | 'system'
  question_id uuid references questions on delete cascade,
  answer_id uuid references answers on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
```

**トリガーで自動化すること**
- `answers` の INSERT/DELETE で `questions.answer_count` を更新
- `answer_votes` の INSERT/DELETE で `answers.helpful_count` を更新
- `answers` INSERT 時に相談投稿者へ `notifications` を作成
- `questions.best_answer_id` 更新時に `status = 'resolved'` にし、回答者へ通知

**インデックス**: `questions(created_at desc)`, `questions(status)`, `answers(question_id)`, `question_categories(category_id)`、本文検索用の GIN インデックス。

---

## 6. 認可（Row Level Security）

RLS は**全テーブルで有効化**し、以下を満たすこと。

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | 認証済みユーザーは `is_public = true` のものを閲覧可。自分は常に可 | 自分の行のみ | 自分の行のみ（`role` は変更不可） | 自分のみ |
| questions | 認証済みユーザーは `status != 'hidden'` を閲覧可 | 自分が author かつ `is_profile_complete = true` | 自分の投稿のみ（投稿から24時間以内、または `best_answer_id` の設定） | 自分の投稿のみ（回答0件時のみ） |
| answers | 同上 | 自分が author かつプロフィール完成済み | 自分の回答のみ | 自分の回答のみ |
| answer_votes | 全員 | 自分の `user_id` のみ、自分の回答には投票不可 | 不可 | 自分のみ |
| reports | 自分の通報 + admin | 認証済みユーザー | admin のみ | 不可 |
| notifications | 自分宛のみ | トリガー経由（service role） | 自分（既読フラグのみ） | 自分のみ |

- `admin` は `profiles.role = 'admin'` を参照する SECURITY DEFINER 関数で判定する
- **未ログインユーザーに相談本文を見せるかは設定で切り替え可能にする**（デフォルト: タイトルとカテゴリのみ表示、本文は要ログイン）

---

## 7. デザイン方針

SenpaiNet の既存テイストを踏襲する:

- **和紙・活版印刷の質感**: 生成り色の背景（`#F7F4EC` 系）、わずかな紙目テクスチャ、沈んだ墨色のテキスト（`#2B2A28`）、アクセントは藍（`#2F4F6F`）もしくは臙脂
- **タイポグラフィ**: 日本語は游明朝 / Noto Serif JP を見出しに、本文は Noto Sans JP。欧文見出しは控えめに
- 角丸は小さめ（4〜6px）、影は使わず**罫線と余白**で構造を作る
- カテゴリチップは活版のインク溜まりを思わせる質感
- アニメーションは控えめ（フェードイン、200ms程度）
- **モバイルファースト**。相談投稿と閲覧がスマホで完結すること
- ダークモードは任意（実装するなら和紙の暗色版として設計）
- アクセシビリティ: WCAG 2.1 AA 準拠（コントラスト比4.5:1以上、キーボード操作、フォーカスリング、適切な見出し階層、フォームラベル）

---

## 8. 非機能要件

- **セキュリティ**: XSS対策（ユーザー入力は必ずエスケープ、`dangerouslySetInnerHTML` 禁止）、CSRF、レート制限（同一ユーザーの連続投稿を制限）
- **個人情報**: 大学名・本名は非公開設定可。投稿本文中の個人情報は投稿前に警告
- **SEO/OGP**: LP のみインデックス許可。相談詳細は `noindex`（学内向けのため）。OGP画像を用意
- **パフォーマンス**: LCP 2.5秒以内、画像は next/image もしくは適切な最適化
- **法務ページ**: 利用規約・プライバシーポリシー・コミュニティガイドラインのテンプレートを `/legal/*` に配置（内容はプレースホルダで可、要点は列挙する）
- **i18n**: 日本語のみ。ただし文言は `lib/messages.ts` に集約し、後から多言語化できる構造に

---

## 9. 将来拡張（今回は実装しないが設計に含める）

- **先輩へのインセンティブ設計**: 回答数・ベストアンサー数に応じたポイント / バッジ。`profiles` にポイント列を足せる構造にしておく
- 双方向ブロードキャスト（卒業生から在校生への情報発信枠）
- 1対1のDM（まずは公開Q&Aのみで運用）
- 学校公式アカウントによるお知らせ投稿
- メール通知（Supabase Edge Function + Resend 等）

---

## 10. 実装の進め方

**フェーズ1 — 土台**
1. プロジェクト初期化、Tailwind設定、デザイントークン（色・フォント・余白）を `globals.css` と `tailwind.config.ts` に定義
2. Supabase プロジェクト用の SQL マイグレーション（上記スキーマ + RLS + トリガー + カテゴリ初期データ）を `supabase/migrations/` に作成
3. 認証（サインアップ / ログイン / ログアウト / セッション管理）

**フェーズ2 — コア機能**
4. オンボーディング（プロフィール作成ウィザード）
5. 相談投稿 → 一覧 → 詳細 → 回答 の一連のフロー
6. 「参考になった」投票、ベストアンサー選出

**フェーズ3 — LPと仕上げ**
7. ランディングページ（実データを使った新着相談・統計）
8. マイページ、通知、プロフィール公開ページ
9. 通報 + 管理画面
10. レスポンシブ調整、アクセシビリティ検証、法務ページ

各フェーズの終わりに `npm run build` が通ること、型エラーがないことを確認してから次へ進んでください。

---

## 11. 成果物

- 動作するソースコード一式（`README.md` に環境変数とセットアップ手順を記載）
- `supabase/migrations/*.sql`（コピペで実行できる状態）
- `.env.local.example`
- 主要画面のスクリーンショットまたは起動手順

---

## 12. 不明点があれば

実装前に確認すべき項目:
- GitHub Pages 継続か Vercel 移行か
- 学校メールドメインでの登録制限を設けるか
- 未ログインユーザーに相談本文を見せるか
- 匿名投稿をデフォルトで許可するか

これら以外の細部は、**上記の方針に沿って妥当な判断で進めて構いません**。判断した内容は実装後に箇条書きで報告してください。

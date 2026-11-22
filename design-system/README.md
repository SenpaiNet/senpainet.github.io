SenpaiNet は、東京学芸大学附属国際中等教育学校（TGUISS）の卒業生（先輩）と在校生をつなぐ相談プラットフォームです。ロゴのブルーとネイビーを軸に、空色の大きな角丸パネルと白いカードで「明るく、安心して相談できる場所」をつくります。

## 基本方針

- **ロゴの2色が主役。** 文字は `ink`（ロゴの「Senpai」のネイビー）、操作と強調は `brand`（ロゴの「Net」と帽子のブルー）。
- **コーラルは1画面に1か所だけ。** いちばん大事な行動（多くは「先輩に相談する」）を `Button` の `accent` にする。それ以外の強調はすべてブルー。
- **余白で区切る。** セクション間は `space-24`、パネル間は `space-16`。罫線より色面と余白でまとまりを見せる。
- **角は丸く。** カードは `radius-md`、大きなパネルは `radius-lg`、ボタンとタグは `radius-pill`。
- **英語の見出し＋日本語ラベル。** `SectionHeading` で「先輩紹介」の下に大きく「Senpai」。意味は日本語ラベルが担い、英字は飾り。

## 言葉づかい

- 読み手は中高生とその先輩。です・ます調で、やさしく短く。専門用語やビジネス用語（「ソリューション」「支援」など）は使わない。
- 呼びかけは「あなた」、卒業生は「先輩」、在校生は「在校生」。「ユーザー」「メンター」とは書かない。
- キャッチコピーは「その悩み、先輩に相談しよう」。この表記のまま（句点なし）使い、言い換えない。ヒーローでは `hero` で読点の後ろで改行し、2行にする：「その悩み、／先輩に相談しよう」。フッターやOGP画像では1行でよい。
- 悩み → できること → 手順の順で語る：「こんなことを相談できます」→ `FeatureCard` →「Step 01 先輩を探す」。
- ボタンは動詞で終える：「先輩に相談する」「無料で登録する」「先輩を探す」。「こちら」「詳細」は使わない。
- 絵文字、感嘆符の連続、誇張（「絶対」「必ず合格」）は使わない。
- 先輩のメッセージ（`SenpaiCard` の `message`）は本人の言葉のまま載せ、編集で盛らない。

## 色

| 役割 | トークン | 使いどころ |
| --- | --- | --- |
| 文字 | `ink` / `ink-muted` | 本文と補足。`ink` はロゴのネイビー |
| ブランド | `brand` | 主ボタン、リンク、英字見出し、アイコン |
| 濃いブルー | `brand-deep` | ホバー、`brand-soft` 上の文字 |
| 淡いブルー | `brand-soft` | タグ、アイコンの下地、選択中の行 |
| 明るいブルー | `brand-bright` | イラストと装飾のみ（文字は載せない） |
| パネル | `surface-sky` / `surface-periwinkle` | セクションの大きな角丸パネル（交互に） |
| コーラル | `accent-strong` / `accent` | 1画面1つのCTAは `accent-strong`、小さな強調点は `accent` |
| イエロー | `highlight` | イラストとグラフの差し色のみ |

- `brand` の上の文字は `on-brand`（白、4.5:1）。`brand` の文字は `surface` 上なら本文に使えるが、`surface-sky` 上は 3.1:1 なので 24px 以上の英字見出しまで。
- `accent`（#ff766b）に文字は載せない（白で 2.6:1）。コーラルのボタンは `accent-strong`（4.9:1）。
- `ink-muted` はパネルの上では使わない（`surface-sky` 上で 4.0:1）。パネル内の補足も `ink`。
- フォーカスは `focus`（= `brand`）の 2px 実線、2px オフセット。全テーマで背景に対して 4.5:1 以上。
- ダークテーマでは `brand` が明るい青になり、上に載る文字は `on-brand`（濃紺）に切り替わる。

## タイポグラフィ

日本語サイトなので、和文フォントを役割で使い分ける。

- **見出し：Zen Kaku Gothic New**（`heading`）。仮名がやわらかく今っぽく、ロゴの丸みのある字形と並べても硬くならない。`hero` `h2` `h3` `card-title` に使用。
- **本文：Noto Sans JP**（`sans`）。13〜15px で最も読みやすく、先輩の名前に出る難しい漢字（髙・齋・𠮷など）までカバーする。`body` `body-sm` `label` `caption` に使用。
- **英字見出し：Lexend**（`display`）。`display-xl` と `eyebrow` だけ。日本語には使わない。
- 丸ゴシック（Zen Maru Gothic、M PLUS Rounded 1c）は親しみは出るが子どもっぽく、相談の信頼感が下がるため不採用。BIZ UDPGothic は読みやすいが事務的。比較は Typography グループの「JapaneseFonts」カード。
- 見出しは `font-feature-settings: "palt"`（字詰め）をかけ、`word-break: auto-phrase` で文節改行する。本文には palt をかけず、行間は `body` の 28px（約1.87倍）を保つ。
- 本文は `line-break: strict`（句読点・小書き仮名を行頭に置かない）。
- 1行の長さは本文で 35〜40 字まで。ヒーローは「その悩み、」「先輩に相談しよう」の 2 行。
- フォントは Google Fonts から読み込む。Windows でも崩れないよう、代替に Hiragino Sans → Yu Gothic UI → Meiryo を指定済み。

## レイアウト

- 最大幅 1120px、左右余白 `space-12`（モバイルは `space-6`）。
- ページの順番：`SiteHeader` → ヒーロー → 相談できること（`Panel` の中に `FeatureCard` 3〜4枚）→ 先輩紹介（`SenpaiCard` を3列）→ 使い方（Step 01〜03 の `Panel` を交互の色で）→ よくある質問 → 最後の CTA 帯。
- カードは白、`shadow-card`、`radius-md`、padding `space-6`、間隔 `space-3`。
- モバイルではカードを1列、パネルの padding を `space-6` に。

## ロゴ

`assets/Logos/README.md` を参照。通常は `logo-horizontal.png`、`brand` やダークテーマ、写真の上では `logo-horizontal-white.png`。色ロゴを空色パネルや `brand` の上に置かない。

## アイコンとイラスト

- ブランド専用のアイコンセットはない。Lucide（lucide.dev）の線アイコンを、線幅 1.75px・22px・`currentColor` で使う。色は `brand`、下地は `brand-soft` のチップ。
- イラストはフラットで、`brand` `brand-bright` `ink`、白、差し色に `highlight`。グラデーションは `app-icon.png` 以外で使わない。
- 写真は在校生・卒業生本人が掲載に同意したものだけ。角は `radius-lg`。

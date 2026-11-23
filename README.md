# SenpaiNet

全国の中学生・高校生が、全国の先輩や自分の学校の先輩に相談できるサイト。Next.js (App Router) + Tailwind CSS + **Firebase（Authentication + Firestore）**。
機能の仕様は `SPEC.md`、見た目は `design-system/` と `design/`。進め方は `CLAUDE.md`。

Firebase プロジェクトは、旧サイト（senpainet.github.io）と同じ **`senpainet-console`**。
新サイトは旧サイトと名前の重ならない新しいコレクションを使い、旧データは移行スクリプトで写す。

## セットアップ（手元）

```powershell
npm install
```

`.env.local.example` を `.env.local` にコピーして値を入れる（Firebase の Web 設定。公開されても問題ない値）。

```powershell
npm run dev
```

### 本番に触れずに試す（エミュレーター）

Java が必要（`winget install EclipseAdoptium.Temurin.21.JRE`）。ターミナルを2つ使う：

```powershell
npm run emulators
```

```powershell
npm run dev:emu
```

`http://localhost:3001` が手元のエミュレーターにつながる。メール確認のリンクは
`http://127.0.0.1:9099/emulator/v1/projects/senpainet-console/oobCodes` で見られる。

## 本番に出す前に（Firebase コンソール・CLI）

1. **ログイン方法を有効にする**：Authentication > ログイン方法 で「Google」（有効済み）と「メール/パスワード」。
2. **承認済みドメイン**：Authentication > 設定 > 承認済みドメイン に、公開する URL（Vercel など）を追加。
3. **ルールとインデックスを反映**（旧サイトのルールも同じファイルに含めてあるので、旧サイトは今まで通り動く）：

   ```powershell
   npm run test:rules
   ```

   ```powershell
   firebase deploy --only firestore:rules,firestore:indexes --project senpainet-console
   ```

4. **旧データを移す**：まず確認だけ（書き込まない）。認証は `gcloud auth application-default login`（senpainet-console に権限のあるアカウント）か、サービスアカウントの鍵を `GOOGLE_APPLICATION_CREDENTIALS` に。

   ```powershell
   npm run migrate:legacy
   ```

   ```powershell
   npm run migrate:legacy -- --write
   ```

5. 公開は GitHub Pages（下の「公開」）。

## 公開（GitHub Pages）

- 新サイト：https://senpainet.github.io/ （このリポジトリ `SenpaiNet/senpainet.github.io`）
- 旧サイト：https://senpainet.github.io/old/ （リポジトリ `SenpaiNet/old`）
- `main` に push すると `.github/workflows/deploy.yml` がビルド（`next build` → `out/` に静的書き出し）して公開する。
- 本番の設定値は `.env.production`（公開されても問題ない Firebase の Web 設定）。手元では `.env.local` が優先される。
- 静的書き出しのため、相談の詳細は `/board/view/?id=…`、プロフィールは `/profile/view/?id=…` の形の URL。

## データの置き場所（Firestore）

| コレクション | 中身 | 読める人 |
|---|---|---|
| `profiles/{uid}` | プロフィール。`private/info` に非公開の大学名 | ログイン中で公開設定の人・本人・運営 |
| `questions/{id}` | 相談のタイトル・カテゴリ・件数・投稿者の属性（匿名なら名前と id は null） | 誰でも（非表示は本人と運営だけ） |
| `questionBodies/{id}` | 相談の本文 | ログイン中の人 |
| `questionOwners/{id}` | 相談の投稿者（匿名の相談でも本人確認に使う）と既読数 | 本人と運営 |
| `questions/{id}/qaAnswers/{id}` | 回答（`parentId` つきは旧サイトの返信） | ログイン中の人 |
| `…/qaAnswers/{id}/qaVotes/{uid}` | 「参考になった」 | 本人 |
| `notifications` | ベストアンサー選出・運営からのお知らせ | 本人 |
| `qaReports` | 通報 | 運営 |
| `qaCategories` | カテゴリ（空なら初期の12種類） | 誰でも |
| `admins/{メール}` | 運営メンバー（旧サイトと共通） | 本人と運営 |
| `config/qaSettings` | `allowedEmailDomain`（学校ドメイン制限） | 誰でも |

サーバー処理（Cloud Functions）は使っていない。回答数・「参考になった」の数・連投制限（20秒）・ベストアンサーの通知は、
同じバッチで書く決まりをセキュリティルールで強制している（`firestore.rules`、テストは `tests/firestore.rules.test.ts`）。

## 設定の切り替え

| やりたいこと | 方法 |
|---|---|
| 学校ドメインだけ登録を許可 | `.env.local` の `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`（画面の案内）＋ Firestore の `config/qaSettings` に `allowedEmailDomain: "tguiss.ed.jp"`（本番の制限） |
| 運営を追加 | 旧サイトと同じ。`admins/{メールアドレス}` を作る（管理画面から追加する機能は未実装） |

## 注意

- 卒業生は自己申告（在校生→卒業生への自動切り替えはある）。
- 未ログインの人には、相談のタイトルとカテゴリだけを見せる（本文を見せる設定は未対応）。
- キーワード検索は、読み込んだ相談のタイトルと本文から探す（Firestore は部分一致検索ができないため）。
- 退会すると、回答のない相談は削除、回答のある相談と自分の回答は名前を消して匿名で残す。
- 旧サイトの通報・お問い合わせ・お知らせ（news）・先輩のメール通知（senpaiProfiles / mailQueue）は移行していない。

## スクリプト

`npm run dev` / `npm run dev:emu` / `npm run emulators` / `npm run test:rules` / `npm run migrate:legacy` / `npm run build` / `npm run typecheck`

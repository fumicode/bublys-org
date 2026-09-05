# Google Sheets 連携のセットアップ

CSV Importer の Google Sheets 連携（pull / push）を動かすための設定手順と、
実際にハマった落とし穴をまとめます。

> **実装がどうなっているか**（コンポーネント構成、API一覧、データ変換の仕組み）は
> [実装ガイド «6. Google Sheets連携»](./implementation-guide.md#6-google-sheets連携csv-importer-libsfeature--ui) を参照してください。
> こちらは**設定と運用**に絞ります。

---

## なぜ設定がこれだけで足りるのか

必要な設定を判断するのに、最低限おさえておく点だけ:

- 認証は **Google Identity Services (GIS) の token client**
  （[`useGoogleSheetsAuth.ts`](../csv-importer-libs/src/feature/useGoogleSheetsAuth.ts)）。
  ブラウザ内のポップアップでアクセストークンを取る方式
- API は `https://sheets.googleapis.com/v4` を `fetch` で直接叩く
  （[`googleSheetsApi.ts`](../csv-importer-libs/src/feature/googleSheetsApi.ts)）
- スコープは `https://www.googleapis.com/auth/spreadsheets`（読み書き）

ここから導かれること:

| | 要否 | 理由 |
|---|---|---|
| OAuth クライアントID | **必要** | GIS の `initTokenClient` に渡す |
| APIキー | 不要 | Bearer トークンだけで叩いている |
| クライアントシークレット | 不要 | ブラウザ内の token 方式なので使わない |
| サービスアカウント | 不要 | ユーザー本人の権限で動く |
| リダイレクトURI | 不要 | ポップアップ方式。**JavaScript生成元**だけ設定する |
| Google Drive API | 不要 | シートURLを手入力する作りで、Picker を使っていない |

---

## Cloud Console での手順

### 1. Google Sheets API を有効化

「APIとサービス」→「ライブラリ」→ `Google Sheets API` → **有効にする**

### 2. OAuth 同意画面

「APIとサービス」→「OAuth同意画面」

- User Type: **外部**（組織アカウントで社内限定にするなら「内部」）
- アプリ名 / サポートメール / デベロッパー連絡先を入力
- スコープに `.../auth/spreadsheets` を追加
- 公開ステータスは **「テスト」のまま**にして、**テストユーザー**に自分のアカウントを追加

> `spreadsheets` は Google の分類上**機密スコープ**です。
> 一般公開するなら審査が必要ですが、「テスト」状態 + テストユーザー登録なら審査なしで使えます。
> 制限は「テストユーザー100人まで」「リフレッシュトークンが7日で失効」。開発用途では実質困りません。

### 3. OAuth クライアントID を作成

「認証情報」→「認証情報を作成」→「OAuth クライアント ID」

- アプリケーションの種類: **ウェブ アプリケーション**
- **承認済みの JavaScript 生成元**（後述の落とし穴 2 を必ず読むこと）:
  ```
  http://localhost:4200    ← csv-importer 単体起動
  http://localhost:4000    ← bublys-os にバブリとして読み込む場合
  ```
- **承認済みのリダイレクトURI は空のままでよい**

### 4. アプリ側に設定

```bash
cd csv-importer-bubly/csv-importer-app
cp .env.example .env
```

```
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

---

## 落とし穴

### 1. バブリとして動かすなら `.env` 変更後に再ビルドが必要 ★最重要

**症状**: csv-importer 単体では動くのに、bublys-os にバブリとして読み込むと
「Google クライアントIDが未設定です」と出る。

**原因**: `import.meta.env.VITE_GOOGLE_CLIENT_ID` は Vite が**ビルド時に文字列へ置換**するもので、
実行時に `.env` を読むわけではありません。そして bublys-os は、csv-importer が事前にビルドした
`public/bubly.js` を `loadBublyFromOrigin()` でそのまま読み込むだけです。

つまり値が焼き込まれる先は `bubly.js` であって、bublys-os 側ではありません。
`.env` を作る前にビルドした `bubly.js` は、こうなったまま残ります:

```js
const GOOGLE_CLIENT_ID = void 0;   // ← undefined が焼き込まれている
```

**対処**:

```bash
npx nx build:bubly csv-importer-app
```

再ビルド後に `public/bubly.js` を確認すると、値が入っています:

```js
const GOOGLE_CLIENT_ID = "xxxxx.apps.googleusercontent.com";
```

> **`.env` を変えたら毎回 `build:bubly` が要る**、というのがこの構成の性質です。
> スタンドアロン（`nx dev`）で動くのは、dev サーバーが起動時に `.env` を読み直すためです。

**やってはいけない対処**: bublys-os 直下に `.env` を置く。
この経路では一切参照されないので、症状は変わりません。

### 2. JavaScript生成元は「ホストページ側」のオリジン

OAuth ポップアップは、バブリの配信元（4200）ではなく
**ホストページのオリジン**で開きます。bublys-os 経由で使うなら
bublys-os のオリジン（`http://localhost:4000`）を登録しないと
`origin mismatch` 系のエラーになります。

単体起動とバブリ経由の両方で試すなら、**両方**登録しておくのが楽です。

その他、生成元まわりの注意:

- **末尾スラッシュは付けない** — `http://localhost:4200/` は不可
- `localhost` と `127.0.0.1` は**別オリジン扱い**。両方使うなら両方登録する
- 変更の反映に数分〜稀に数時間かかることがある。
  設定直後の `idpiframe_initialization_failed` は待てば直る場合がある

### 3. `.env` の置き場所はリポジトリ直下ではない

`csv-importer-bubly/csv-importer-app/.env` です。
Vite の `root` がそのディレクトリなので、リポジトリ直下に置いても読まれません。

### 4. 未確認アプリの警告

テストユーザーとして登録済みのアカウントなら、
「詳細」→「（アプリ名）に移動」で通過できます。

### 5. シートへの編集権限

アクセストークンは**認証したユーザーの権限**で動きます。
Pull はできるのに Push だけ 403 で落ちる、というのが典型です。

| スプレッドシートの共有 | Pull（読み込み） | Push（書き込み） |
|---|---|---|
| リンクを知っている全員：**閲覧者** | ○ | **×（403）** |
| リンクを知っている全員：**編集者** | ○ | ○ |

---

## クライアントIDの秘匿性について

OAuth クライアントIDは `bubly.js` にそのまま文字列で入りますが、これは仕様上問題ありません。
クライアントIDは公開前提の値で、保護は**JavaScript生成元の制限**によって行われます。

ただし `.env` 自体はコミットしないでください（`.gitignore` 済み）。

---

## トラブルシューティング早見表

| 症状 | 原因 | 対処 |
|---|---|---|
| 「クライアントIDが未設定です」（バブリ経由のみ） | `bubly.js` が古い | `npx nx build:bubly csv-importer-app` |
| 「クライアントIDが未設定です」（単体でも） | `.env` の場所か dev サーバー未再起動 | `csv-importer-app/.env` を確認して再起動 |
| `origin mismatch` / ポップアップが即閉じる | JavaScript生成元の未登録 | ホスト側オリジンを追加 |
| 「Google Identity Services を読み込めませんでした」 | GISスクリプトの読み込み失敗 | ネットワーク / CSP / 広告ブロッカーを確認 |
| pull / push が 403 | シートへの権限不足 | 認証したアカウントの編集権限を確認 |
| 401 が突然出るようになった | テストモードのトークン失効（7日） | 再度サインインする |

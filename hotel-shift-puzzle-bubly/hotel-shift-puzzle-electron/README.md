# シフトントン デスクトップ版（Electron）

ネットにつながない PC で、ブラウザもサーバーも立てずにシフトントンを動かすための EXE（#238）。
いまは「EXE にできる」ことを示すデモで、中身は Web 版（ホテル版）と同じ。

やっていることは **Web 版の画面（`hotel-shift-puzzle-app` の `dist/`）を、ネットにつながない窓で開く** だけ。
画面のコードには手を入れていない。

## ルール

| ルール | どこで | なぜ |
|---|---|---|
| 画面は `app://shiftonton/` で配る | `src/main.ts`・`src/lib/resolveAppFile.ts` | `file://` だと `<base href="/">` と、バブルの並びを URL のパスに書く仕組みが壊れる |
| 知らないパスは `index.html` を返す | `src/lib/resolveAppFile.ts` | Vercel の rewrites と同じ。バブルの並びの URL でリロードしても画面が出る |
| アプリの外へは一切つながない | `src/lib/networkPolicy.ts` | 行政の現場はネット接続が禁止。つなごうとしたら止めて、ログに残す |
| 同時に開けるのは 1 つだけ | `src/main.ts` | 2 つ開くと同じデータのフォルダを取り合う |
| **識別子は一度配ったら変えない** | `src/lib/identity.ts`・`electron-builder.yml` の `appId` | 変えると、前の版で作った勤務表が見えなくなる |

変えてはいけない値:

- オリジン `app://shiftonton`
- データのフォルダ `%APPDATA%\shiftonton`（Linux は `~/.config/shiftonton`）
- appId `org.bublys.shiftonton`

表示名（`productName`、スタートメニューに出る「シフトントン」）は、データの置き場所と切り離してあるので変えてよい。

## データ

- Web 版と同じく、localStorage と IndexedDB に保存する。置き場所は上のデータのフォルダの中
- **Web 版（Vercel）のデータとは別。** オリジンが違うので、Web 版で作った勤務表は EXE からは見えない。
  移すときは、Web 版のファイルバブルで勤務表ファイル（`.hsp.json`）に保存し、EXE で開く
- バックアップも勤務表ファイルで取る
- アンインストールしてもデータは残る（入れ直せば元どおり見える）

## コマンド

```bash
# 開発中に起動する（Web 版をビルドしてから、その dist/ を窓で開く）
npx nx run @bublys-org/hotel-shift-puzzle-electron:start

# 開発者ツール: 開発中だけ F12 で開く（インストールした版では開かない）

# パッケージの中身を確かめる（インストーラーは作らない。release/ に出る）
npx nx run @bublys-org/hotel-shift-puzzle-electron:package:dir

# テスト
npx nx test @bublys-org/hotel-shift-puzzle-electron
```

VS Code の端末から起動すると、`ELECTRON_RUN_AS_NODE=1` が引き継がれていて Electron がただの Node として動くことがある。
そのときは `env -u ELECTRON_RUN_AS_NODE npx nx run ...:start` で起動する。

## Windows のインストーラーを作る

GitHub Actions の Windows ランナーで作る（`.github/workflows/shiftonton-desktop.yml`）。

1. GitHub の Actions →「シフトントン デスクトップ版（Windows）」→ Run workflow
2. 終わったら、実行結果のページの Artifacts から `shiftonton-windows` をダウンロードする
3. 中の `shiftonton-setup-<版>.exe` がインストーラー

## 配り方・更新のしかた（現場向け）

- インストーラーはユーザーごと（管理者権限は要らない）。ダブルクリックするとそのまま入って起動する
- **コード署名はまだしていない。** 初めて開くと「Windows によって PC が保護されました」と出るので、
  「詳細情報」→「実行」で進む
- **更新は手で配る**（自動更新はしない）。新しいインストーラーを実行すれば上書きされ、データは残る
- 念のため、更新の前に勤務表ファイルへ保存しておく
- 版は `package.json` の `version`。上げてからインストーラーを作る（バージョン管理の仕組みは #228）

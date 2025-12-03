# Repository Guidelines

この Nx モノレポは Next 15 + React 19 を中心に、DDD 3 層（domain/ui/feature）を採用したアプリと共有ライブラリで構成されています。小さく速く届けるための実務的な手引きです。

## プロジェクト構成とアーキテクチャ
- アプリ: `apps/`。`bublys-os` がメインの Next アプリ、`calculator`/`memo` は Vite/React。静的ファイルは各 `public/`。
- 共有ライブラリ: `bublys-libs/*`（UI・状態）と `memo-libs/*`（ドメイン/モデル/状態）。`src/` から公開し、ビルド成果は `dist/`。
- 3 層 DDD 例: `apps/bublys-os/app/world-line/Counter/`（domain→ui→feature）。Redux ストアは `bublys-libs/state-management/src/lib/store.ts`、Provider は `apps/bublys-os/app/StoreProvider.tsx`。
- テストは実装近くに配置（例: `apps/bublys-os/specs`, `*.spec.ts[x]`）。クロスパッケージ import は Nx 境界ルールを守る。

## ビルド・テスト・開発コマンド
- セットアップ: Node 24.x / npm 10.x で `npm install`。
- 開発: `npx nx dev bublys-os` または `npm run dev`。ライブラリ監視は `npx nx dev state-management`（tsc --watch）。
- ビルド: `npx nx build bublys-os`（成果物 `dist/apps/bublys-os/.next`）。ターゲット確認は `npx nx show project bublys-os`。
- テスト: Next アプリは Jest（`npx nx test bublys-os`）、Vite 系は Vitest（`npx nx test calculator`, `npx nx test memo`）。カバレッジは `test-output/vitest/coverage`。
- 補助: `npx nx lint <project>`、依存可視化 `npx nx graph`、コード生成 `npx nx g @nx/next:app <name>` / `npx nx g @nx/react:lib <name>`。

## コーディングスタイルと命名
- TypeScript 基準、2 スペースインデント、Prettier 既定。プッシュ前に lint を実行。
- UI は styled-components を軸に、`bublys-os` では Emotion/MUI も併用。関数コンポーネント + hooks を優先し、`"use client"` は最小限。
- Redux は型付きフック必須（`useAppDispatch`/`useAppSelector`/`useAppStore`）。直接の `useDispatch`/`useSelector` は避ける。
- ドメインクラスのプロパティは `state` オブジェクトを介して保持し、直接メンバー変数をばらまかない。
- コンポーネントは PascalCase、ユーティリティは camelCase、テストは `*.spec.ts[x]`。公開 API は各パッケージの index からエクスポート。
- `@nx/enforce-module-boundaries` を守り、深いパス参照ではなく公開エクスポート経由で依存する。

## テスト指針
- 本番で使う hooks/reducer を意識した単体テストを追加。React は Testing Library で DOM を検証。
- テストは決定的に（実タイマー・外部ネットワークを避ける）。新機能にはハッピーパスとエッジケースを最低 1 本ずつ。
- 実装に近接して配置し、意図的な挙動変更時はカバレッジ基準も更新。

## コミット & PR ガイド
- Conventional Commits 風（`feat:`, `fix:`, `refactor:` など + 命令形の短文）。対象パッケージや領域が明確なら文言に含める。
- PR には概要、関連 Issue/チケット、実行した lint/test、UI 変更なら Before/After スクショを添付。
- 変更は小さく分割し、レビュー前に該当プロジェクトの `nx lint/test/build` を通す。

## セキュリティと運用
- 秘密情報は各アプリの未追跡 `.env.local` に保持し、コミットしない。コード例はプレースホルダーを使用。
- キャッシュクリアは必要最低限（`npx nx reset` は不安定時のみ）。通常は Nx のローカルキャッシュを活用する。

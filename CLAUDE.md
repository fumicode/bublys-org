# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) にガイダンスを提供します。

## 開発コマンド

**メイン開発:**
```bash
npx nx dev bublys-os              # メインアプリのNext.js devサーバーを起動
npx nx build bublys-os            # 本番ビルド
npx nx test bublys-os             # アプリのJestテストを実行
npx nx lint bublys-os             # ESLintを実行
```

**テスト:**
```bash
npx nx test <project-name>        # 特定プロジェクトのテストを実行
npx nx test <project-name> --testFile=<filename>  # 単一テストファイルを実行
npx nx test --watch               # ウォッチモードでテストを実行
```

**プロジェクト管理:**
```bash
npx nx show project bublys-os     # 利用可能なターゲット/コマンドを表示
npx nx graph                      # プロジェクトの依存関係を可視化
npx nx list                       # インストール済みのNxプラグインをリスト表示
```

**新規コード生成:**
```bash
npx nx g @nx/next:app <name>      # 新しいNext.jsアプリを生成
npx nx g @nx/react:lib <name>     # 新しいReactライブラリを生成
npx nx g @nx/js:lib <name>        # 新しいTypeScriptライブラリを生成
```

**重要:** 新しいライブラリやアプリを作成する際は、必ずNxのジェネレーターコマンドを使用すること。手動でディレクトリやpackage.jsonを作成しない。Nxが適切な設定ファイル（tsconfig、project.json等）を自動生成し、ワークスペースとの整合性を保証する。

## 設計哲学

**シンプルなルールで自然な動作を実現する**

機能を実装する際は、イベントハンドラごとに個別の処理を書くのではなく、言語化しやすいシンプルなルールに基づいて動作が自然と行われるようにすることを目指す。

例：「レイヤーが変わったらフォーカスを解除する」というルールを設定すれば、popChild時に親バブルが奥に移動した際、明示的なイベント処理なしに自然とフォーカスが解除される。

**実装前の議論を重視する**

新しい機能や動作を実装する前に、どのようなルールに基づくべきかを議論し、納得した上で実装する。これにより、一貫性のある予測可能な動作を実現できる。

## アーキテクチャ概要

このリポジトリはNxモノレポで、React + Next.js + Redux Toolkitを使用したアプリケーションです。ドメイン駆動設計（DDD）の3層アーキテクチャを採用しています。

### モノレポ構造

- **apps/bublys-os**: メインのNext.js 15アプリケーション
- **apps/calculator**: 独立した電卓アプリ
- **apps/memo**: 独立したメモアプリ
- **bublys-libs/**: コアライブラリ (state-management, bubbles-ui, bubbles-ui-state)
- **memo-libs/**: メモ専用ライブラリ (memo-state, memo-feature, memo-model)

### 状態管理 (Redux Toolkit)

**ストア設定:** `bublys-libs/state-management/src/lib/store.ts`

Reduxストアは以下を統合しています:
- `counter`: シンプルなカウンター状態
- `bubbles`: 正規化されたバブルUI状態（プロセスはレイヤー、エンティティは個別のバブル）
- `worldLine`: オブジェクトごとのバージョン履歴（後述）
- `environment`: ランタイム環境状態
- `memo`: IDごとのメモエンティティ

**Redux Persist:**
- localStorageへの永続化を設定
- `bubbles`と`environment`スライスは永続化から除外
- `PersistGate`を使用して、再水和が完了するまでレンダリングを遅延

**型付きフック:** 常にこれらを使用してください（生のReduxフックの代わりに）:
- `useAppDispatch()` - 型付きディスパッチ
- `useAppSelector()` - 型付きセレクター
- `useAppStore()` - 型付きストアアクセス

**リスナーミドルウェア:**
`bublys-libs/bubbles-ui-state`に配置され、Redux Toolkitの`createListenerMiddleware`を使用して複雑なクロススライス副作用を実装しています。

### 世界線システム（実験的機能）

世界線システムは、アプリケーション状態のタイムトラベル・バージョン管理を可能にする実験的な機能です。

**配置場所:** `apps/bublys-os/app/world-line/`

**注意:** この機能は現在開発中であり、仕様が変更される可能性があります。詳細な実装パターンはコードを参照してください。

### コンポーネント構成（ドメイン駆動設計）

機能は3層DDD構造に従います:

```
feature-name/
  ├─ domain/     # ドメインモデル、ビジネスロジック、型（React/Redux不要）
  ├─ ui/         # 純粋なプレゼンテーショナルReactコンポーネント
  └─ feature/    # オーケストレーション、状態コネクター、プロバイダー
```

**依存関係の向き:**
```
domain (依存なし)
  ↑
  ui (domainに依存)
  ↑
feature (domain + ui + Reduxに依存)
```

**例:**
- `apps/bublys-os/app/world-line/Counter/` - 3層DDD構造の実装例
- `apps/bublys-os/app/bubble-ui/` - 複雑なバブルUIシステム

**ガイドライン:**
- **ドメイン層**: 純粋なTypeScript、不変データ構造（他の層に依存しない）
  - **重要**: ドメインオブジェクトの状態は`state`オブジェクトを介して管理する
  - 例: `constructor(readonly state: { field1: string; field2: number })`
  - ReactもReduxもインポートしない
- **UI層**: プレゼンテーショナルReactコンポーネント（ドメイン層のみに依存）
  - コンテキストを消費してドメインモデルを表示
  - 直接的なReduxアクセスなし
- **フィーチャー層**: オーケストレーション層（ドメイン層とUI層の両方に依存）
  - Redux統合、副作用、コンテキストプロバイダー
  - ドメインモデルとRedux状態を橋渡し

### 主要なアーキテクチャパターン

1. **設計による不変性:**
   - ドメインクラスは更新時に新しいインスタンスを返す
   - 状態は`state`オブジェクトを介して管理し、イミュータブルに扱う
   - 例: `new MyFeature({ ...this.state, field: newValue })`

2. **ジェネリック型パラメータ:**
   - ドメインモデルはジェネリック型を活用して柔軟性を持たせる
   - serialize/deserialize関数がドメインモデルとRedux JSONを橋渡し

3. **プロバイダーパターン:**
   - フィーチャー層がコンポーネントをラップし、Contextを提供
   - UIコンポーネントはフックを通じてドメインロジックにアクセス
   - Redux実装からコンポーネントを分離

4. **リスナーミドルウェアによる副作用管理:**
   - `bubbles-ui-state`でクロススライスインタラクションに使用
   - 複数の状態スライスにまたがる非同期操作を処理

### 技術スタック

**コア:**
- React 19.0.0
- Next.js 15.2.4 (App Router)
- Redux Toolkit 2.9.0 with Redux Persist 6.0.0
- TypeScript 5.9.2
- Styled Components 5.3.6

**ビルドツール:**
- Nx 21.5.3 (モノレポ管理)
- SWC (高速コンパイル)
- Node 24.x, npm 10.x (package.jsonのenginesを参照)

**テスト:**
- Jest 30.0.2 with ts-jest
- Vitest 3.0.0
- @testing-library/react 16.1.0

### 基本的なデータフロー

1. ユーザーがUIコンポーネントで操作
2. コンポーネントがドメインモデルの更新メソッドを呼び出す
3. 新しいドメインインスタンスが作成される（不変性）
4. フィーチャー層がReduxアクションをディスパッチ
5. Redux storeが更新される
6. redux-persistを通じてlocalStorageに状態を永続化
7. コンポーネントが再レンダリングされる

### 重要な実装ファイル

**Redux設定:**
- `bublys-libs/state-management/src/lib/store.ts` - Reduxストアのセットアップ
- `bublys-libs/state-management/src/lib/slices/` - 各機能のReduxスライス

**アプリセットアップ:**
- `apps/bublys-os/app/StoreProvider.tsx` - Redux Provider + PersistGate

**実装例:**
- `apps/bublys-os/app/world-line/Counter/` - 3層DDD構造の実装例
- `apps/bublys-os/app/bubble-ui/` - 複雑な機能の実装例

### 従うべき一般的なパターン

1. **常に型付きフックを使用:**
   ```typescript
   const dispatch = useAppDispatch();  // useDispatch()ではなく
   const state = useAppSelector(selectSomething);  // useSelector()ではなく
   ```

2. **ドメインモデルは不変である必要がある（stateオブジェクトを介して状態を管理）:**
   ```typescript
   class Counter {
     constructor(readonly state: { count: number }) {}
     increment(): Counter {
       return new Counter({ count: this.state.count + 1 });  // 新しいインスタンスを返す
     }
   }
   ```

3. **テストファイルはソースと同じ場所に配置:**
   - `*.test.ts`または`*.spec.ts`を実装ファイルの隣に配置
   - 例: `memo-slice.ts`の隣に`memo-slice.test.ts`

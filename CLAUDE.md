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
```

## アーキテクチャ概要

このリポジトリは、独自の「世界線(world-line)」システムを特徴とするNxモノレポです。世界線システムは、アプリケーション状態のバージョン管理/タイムトラベル機構です。

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

### 世界線システム（タイムトラベル状態管理）

世界線システムは、アプリケーション状態のための洗練されたバージョン管理メカニズムで、各機能が独自の独立したタイムラインを維持でき、分岐とタイムトラベル機能を持ちます。

**配置場所:** `apps/bublys-os/app/world-line/`

**コアコンセプト:**

1. **World** (`WorldLine/domain/World.ts`):
   - ある時点での状態の不変スナップショット
   - 含まれるもの: `worldId`, `parentWorldId`, `worldState` (ジェネリック), `apexWorldLineId`
   - 更新は`updateWorldState()`を通じて新しいインスタンスを作成

2. **WorldLine** (`WorldLine/domain/WorldLine.ts`):
   - ワールドのタイムラインを管理するジェネリッククラス`WorldLine<TWorldState>`
   - 追跡するもの: すべてのワールド(Map)、`apexWorldId` (現在/HEAD)、`rootWorldId` (初期)
   - 主要メソッド:
     - `grow(worldState)`: タイムラインに新しいワールドを追加（git commitのような）
     - `setApex(worldId)`: 特定のワールドへ移動（git checkoutのような）
     - `setApexForRegrow(worldId)`: 前方へ移動（やり直し）
     - `getWorldTree()`: 可視化のための親子関係を取得

**3層アーキテクチャ:**

1. **ドメイン層** (`WorldLine/domain/`):
   - 純粋なTypeScriptドメインモデル（ReactもReduxも不要）
   - `World.ts`, `WorldLine.ts`: コアの不変データ構造
   - `WorldLineContext.ts`: React Contextの型定義
   - `FocusedObjectContext.tsx`: キーボードショートカットに応答するオブジェクトを追跡

2. **フィーチャー層** (`WorldLine/feature/`):
   - `WorldLineManager.tsx`: ドメインとReduxの間の橋渡し
     - propsとして`objectId`、`serialize`、`deserialize`関数を受け取る
     - Reduxへ接続: `useAppSelector(selectWorldLine(objectId))`
     - アクションをディスパッチ: `updateState()`, `createWorldLine()`, `navigateToWorld()`
     - キーボードショートカットを処理:
       - `Ctrl+Z`: 世界線の可視化を表示（フォーカスされたオブジェクトのみ）
       - `Ctrl+Shift+Z`: やり直し
     - 子コンポーネントにコンテキストを提供

3. **UI層** (`WorldLine/ui/`):
   - `WorldLineView.tsx`: WorldLineコンテキストを消費するジェネリックコンポーネント
   - `WorldView3D.tsx`: 透視投影を使った3D可視化
     - 各ブランチは固有の色を取得
     - HEADからの距離が不透明度/サイズに影響
     - クリックでナビゲート、ダブルクリックでチェックアウト
     - リーフノードには完全なカード、中間ワールドにはドットを表示

**統合パターン:**

機能に世界線サポートを追加するには:

```typescript
// 1. 不変ドメインモデルを作成
class MyFeature {
  constructor(readonly data: string) {}
  updateData(newData: string): MyFeature {
    return new MyFeature(newData);
  }
}

// 2. シリアライゼーションを提供
const serialize = (feature: MyFeature) => ({ data: feature.data });
const deserialize = (json: any) => new MyFeature(json.data);

// 3. WorldLineManagerでラップ
<WorldLineManager<MyFeature>
  objectId="my-feature-1"
  serialize={serialize}
  deserialize={deserialize}
>
  <MyFeatureComponent />
</WorldLineManager>

// 4. コンポーネント内でコンテキストを使用
const { currentWorld, grow, setApex } = useContext(WorldLineContext);
// 状態変更時: grow(newFeatureState)
```

**フォーカスシステム:**
- フォーカスされたオブジェクトの世界線のみが`Ctrl+Z`ショートカットに応答
- `FocusedObjectContext.Provider`を通じてフォーカスを設定
- 複数の世界線オブジェクトが同時に存在する場合の競合を防止

**Redux統合:**
- Reduxスライス: `bublys-libs/state-management/src/lib/slices/world-slice.ts`
- 正規化された状態: `worldLines: { [objectId]: WorldLineState }`
- アクション: `createWorldLine`, `updateState`, `navigateToWorld`, `setApexForRegrow`

### コンポーネント構成（ドメイン駆動設計）

機能は3層DDD構造に従います:

```
feature-name/
  ├─ domain/     # ドメインモデル、ビジネスロジック、型（React/Redux不要）
  ├─ feature/    # オーケストレーション、状態コネクター、プロバイダー
  └─ ui/         # 純粋なプレゼンテーショナルReactコンポーネント
```

**例:**
- `apps/bublys-os/app/world-line/Memo/` - 世界線統合付きメモ
- `apps/bublys-os/app/world-line/Counter/` - 世界線統合付きカウンター
- `apps/bublys-os/app/bubble-ui/` - 複雑なバブルUIシステム

**ガイドライン:**
- ドメイン層: 純粋なTypeScript、不変データ構造
- フィーチャー層: Redux統合、副作用、コンテキストプロバイダー
- UI層: コンテキストを消費するReactコンポーネント、直接的なReduxアクセスなし

### 主要なアーキテクチャパターン

1. **設計による不変性:**
   - ドメインクラスは更新時に新しいインスタンスを返す
   - 安全なタイムトラベルと状態の分岐を可能にする
   - 例: `World.updateWorldState()`, `Memo.updateTitle()`

2. **ジェネリック型パラメータ:**
   - `WorldLine<TWorldState>`は任意の不変状態型で動作
   - serialize/deserialize関数がドメインモデルとRedux JSONを橋渡し

3. **プロバイダーパターン:**
   - WorldLineManagerがコンポーネントをラップし、コンテキストを提供
   - コンポーネントはフックを使って`grow()`, `setApex()`などにアクセス
   - Redux実装からコンポーネントを分離

4. **選択的キーボードショートカット:**
   - FocusedObjectContextが競合を防止
   - フォーカスされたオブジェクトのみがグローバルショートカットに応答
   - 同じ機能の複数インスタンスが存在する場合に必須

5. **複雑な副作用のためのリスナーミドルウェア:**
   - `bubbles-ui-state`でクロススライスインタラクションに使用
   - 複数の状態スライスにまたがる非同期操作を処理

6. **オブジェクトごとの状態分離:**
   - 各機能インスタンスは一意の`objectId`を取得
   - 複数のカウンター、メモなどに対して独立した世界線
   - 同じ機能の複数の独立したインスタンスを可能にする

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

### データフロー例: メモの編集

1. ユーザーが`MemoEditor`コンポーネントで入力
2. `MemoEditor`が`WorldLineContext`から`grow(newMemoState)`を呼び出す
3. `WorldLineManager`がMemoドメインオブジェクトをJSONにシリアライズ
4. Redux `world-slice`へ`updateState()`アクションをディスパッチ
5. redux-persistを通じてlocalStorageに状態を永続化
6. メモがフォーカスされている間にユーザーが`Ctrl+Z`を押す
7. `WorldLineView3D`がすべてのメモワールドの3D可視化を表示
8. ユーザーが3Dビューでワールドをダブルクリック
9. `setApex()`がその履歴的なメモ状態を読み込む
10. メモの`objectId`が`focusedObjectId`と一致する場合のみ動作

### 重要な実装ファイル

**Redux設定:**
- `bublys-libs/state-management/src/lib/store.ts` - Reduxストアのセットアップ
- `bublys-libs/state-management/src/lib/slices/world-slice.ts` - 世界線のRedux状態
- `bublys-libs/state-management/src/lib/slices/memo-slice.ts` - メモのRedux状態

**世界線システム:**
- `apps/bublys-os/app/world-line/WorldLine/domain/` - コアドメインモデル
- `apps/bublys-os/app/world-line/WorldLine/feature/WorldLineManager.tsx` - Redux統合
- `apps/bublys-os/app/world-line/WorldLine/ui/WorldView3D.tsx` - 3D可視化

**統合例:**
- `apps/bublys-os/app/world-line/Memo/` - 世界線付きの完全なメモ実装
- `apps/bublys-os/app/world-line/Counter/` - 世界線付きのシンプルなカウンター

**アプリセットアップ:**
- `apps/bublys-os/app/StoreProvider.tsx` - Redux Provider + PersistGate
- `apps/bublys-os/app/world-line/page.tsx` - 世界線のルートページ

### 従うべき一般的なパターン

1. **常に型付きフックを使用:**
   ```typescript
   const dispatch = useAppDispatch();  // useDispatch()ではなく
   const state = useAppSelector(selectSomething);  // useSelector()ではなく
   ```

2. **ドメインモデルは不変である必要がある:**
   ```typescript
   class Counter {
     constructor(readonly count: number) {}
     increment(): Counter {
       return new Counter(this.count + 1);  // 新しいインスタンスを返す
     }
   }
   ```

3. **世界線統合のためのserialize/deserialize:**
   ```typescript
   const serialize = (memo: Memo) => ({
     id: memo.id,
     title: memo.title,
     content: memo.content
   });
   const deserialize = (json: any) => new Memo(json.id, json.title, json.content);
   ```

4. **世界線コンテキストでの状態更新にはgrow()を使用:**
   ```typescript
   const { currentWorld, grow } = useContext(WorldLineContext);
   const handleUpdate = () => {
     const newState = currentWorld.worldState.updateSomething();
     grow(newState);  // タイムラインに新しいワールドを作成
   };
   ```

5. **テストファイルはソースと同じ場所に配置:**
   - `*.test.ts`または`*.spec.ts`を実装ファイルの隣に配置
   - 例: `memo-slice.ts`の隣に`memo-slice.test.ts`

# CSV Importer 実装ガイド

このドキュメントでは、CSV Importerバブリの実装内容を説明します。
自動生成されたファイル（package.json、tsconfig.json、vite.config.mts など）は除き、
**手書きで実装したファイル**のみを対象にしています。

---

## 全体像

CSV Importerは3つのパッケージで構成されています:

```
csv-importer-model/   ← データの「形」と「操作」を定義（純粋なTypeScript）
csv-importer-libs/    ← 画面の部品と、データの保存・読み出しロジック
csv-importer-app/     ← 上記をまとめてアプリとして動かす設定
```

データの流れ（世界線グラフ統合後）:

```
ユーザーがセルをクリックして編集
        ↓
UI層（SheetEditorView）がコールバックを呼ぶ
        ↓
Feature層（SheetEditorFeature）が shell.update() を呼ぶ
        ↓
世界線グラフが新しいノードを作成（自動コミット）
        ↓
CASにハッシュベースで状態を保存（Redux + IndexedDB）
        ↓
画面が自動的に再描画される
```

**ポイント**: セルを1つ編集するたびに世界線に自動コミットされる。
undo/redoはシートごとに独立して動作する。

---

## 1. ドメインモデル（csv-importer-model）

### `src/lib/CsvSheet.ts`

**役割**: CSVシートのデータ構造と操作ルールを定義する「設計図」。
ReactやReduxには一切依存しない、純粋なTypeScriptコード。

#### データの型

```typescript
// 1列の情報
type CsvColumnState = {
  id: string;      // 列の固有ID（例: "abc-123"）
  name: string;    // ヘッダー名（例: "名前", "メール"）
};

// 1行の情報
type CsvRowState = {
  id: string;                       // 行の固有ID
  cells: Record<string, string>;    // { 列ID: 値 } の辞書
  // 例: { "abc-123": "田中", "def-456": "tanaka@example.com" }
};

// シート全体の情報
type CsvSheetState = {
  id: string;
  name: string;                     // シート名
  columns: CsvColumnState[];        // 列の配列（順序あり）
  rows: CsvRowState[];              // 行の配列（順序あり）
  createdAt: string;                // 作成日時
  updatedAt: string;                // 更新日時
};
```

**なぜcellsが配列ではなくRecord（辞書）なのか？**
→ 列の追加・削除・並び替えに強いため。配列だと「3番目の値」のような位置依存になるが、辞書なら列IDで紐づくので列順が変わっても安全。

#### CsvSheetクラスの主要メソッド

| メソッド | 説明 | 戻り値 |
|---------|------|--------|
| `CsvSheet.create(name, columnNames)` | 空のシートを新規作成 | 新しいCsvSheet |
| `CsvSheet.fromCsvText(name, csvText)` | CSVテキストをパースしてシートを作成 | 新しいCsvSheet |
| `sheet.addColumn(name)` | 列を末尾に追加（既存行にも空セルが追加される） | 新しいCsvSheet |
| `sheet.renameColumn(columnId, name)` | 列名を変更 | 新しいCsvSheet |
| `sheet.deleteColumn(columnId)` | 列を削除（各行から該当セルも消える） | 新しいCsvSheet |
| `sheet.addRow()` | 空行を末尾に追加 | 新しいCsvSheet |
| `sheet.deleteRow(rowId)` | 行を削除 | 新しいCsvSheet |
| `sheet.updateCell(rowId, columnId, value)` | セルの値を更新 | 新しいCsvSheet |
| `sheet.rename(name)` | シート名を変更 | 新しいCsvSheet |
| `sheet.toCsvText()` | CSV形式のテキストに変換（エクスポート用） | 文字列 |
| `sheet.toJSON()` | 保存用のプレーンオブジェクトに変換 | CsvSheetState |
| `CsvSheet.fromJSON(json)` | プレーンオブジェクトからCsvSheetを復元 | CsvSheet |

**重要な設計原則: 不変性（イミュータビリティ）**

すべてのメソッドは**元のシートを変更せず、新しいシートを返す**。

```typescript
const original = CsvSheet.create("テスト", ["名前"]);
const updated = original.addColumn("メール");

// originalは変わっていない！
original.columns.length  // → 1
updated.columns.length   // → 2
```

この不変性が世界線グラフとの相性が良い理由。`shell.update(s => s.addColumn("メール"))` のように、現在の状態を受け取って新しい状態を返す関数を渡すだけで自動コミットされる。

#### CSVパーサー（内部ヘルパー関数）

`parseCsvLines(text)` — CSVテキストを2次元配列に変換する内部関数。
以下のCSV仕様に対応:
- カンマ区切り
- ダブルクオートで囲まれたフィールド（中にカンマや改行を含むケース）
- `""` によるダブルクオートのエスケープ
- CRLF（Windows）と LF（Mac/Linux）の両方の改行コード

`escapeCsvField(field)` — フィールドにカンマ・改行・ダブルクオートが含まれる場合、ダブルクオートで囲む。

---

### `src/lib/CsvSheet.test.ts`

**役割**: CsvSheetの動作を自動テストで検証する。16個のテストケース。

| テストカテゴリ | テスト内容 |
|--------------|----------|
| create | 列名を指定して空シートを作成できる |
| fromCsvText | CSVテキストから正しくパースできる / ダブルクオート対応 / 空CSV / CRLF対応 |
| column ops | 列の追加・リネーム・削除が正しく動く |
| row ops | 行の追加・削除・セル更新が正しく動く |
| rename | シート名変更 |
| toCsvText | CSVエクスポートが元のCSVと一致する / 特殊文字のエスケープ |
| serialization | toJSON → fromJSON でデータが完全に復元される |
| immutability | 操作後に元のインスタンスが変更されていないことを確認 |

---

## 2. 世界線グラフ統合（csv-importer-libs/feature）

### `src/feature/CsvSheetProvider.tsx`

**役割**: 世界線グラフシステムとCSVシートを接続するプロバイダー。sekaisen-igo-bublyのIgoGameProviderと同じパターン。

#### 2つのスコープ構造

```
グローバルスコープ "csv-importer"
  └─ CsvSheetMeta オブジェクト（id, name）× N枚
      │
      ├─ シートスコープ "csv-sheet-{sheetId1}"
      │    └─ CsvSheet オブジェクト（シートの全データ）
      │
      └─ シートスコープ "csv-sheet-{sheetId2}"
           └─ CsvSheet オブジェクト（シートの全データ）
```

- **グローバルスコープ**: 「どのシートが存在するか」を管理（メタデータのみ）
- **シートスコープ**: 各シートの中身（列・行・セル）を管理。**undo/redoはシート単位で独立**

#### ドメインオブジェクト登録

```typescript
const CSV_DOMAIN_OBJECTS = defineDomainObjects({
  "csv-sheet": {
    class: CsvSheet,
    fromJSON: (json) => CsvSheet.fromJSON(json as CsvSheetState),
    toJSON: (s: CsvSheet) => s.toJSON(),
    getId: (s: CsvSheet) => s.id,
  },
  "csv-sheet-meta": {
    class: Object,
    fromJSON: (json) => json as CsvSheetMeta,
    toJSON: (obj: CsvSheetMeta) => obj,
    getId: (obj: CsvSheetMeta) => obj.id,
  },
});
```

世界線グラフが`CsvSheet`を保存/復元するための設定。`fromJSON`/`toJSON`で変換、`getId`でオブジェクトを特定。

#### 一時保持マップ（pendingSheets）

シート作成時（SheetListFeature）とエディタ表示時（SheetEditorFeature）は別コンポーネントのため、作成したCsvSheetをエディタに直接渡せない。これを解決するために、モジュールレベルの`pendingSheets` Mapを使用:

```
SheetListFeature: CsvSheet.create() → addSheet(sheet)
    ↓ pendingSheets.set(sheet.id, sheet)
SheetEditorFeature: popPendingSheet(sheetId) → initialObjectsとして使用
```

- `addSheet(sheet)` はメタ登録+スコープ作成に加え、`pendingSheets`にシートを保存
- `popPendingSheet(sheetId)` は一時保持されたシートを取得して削除（1回限り）
- エディタがマウントされた後、世界線グラフが永続化を担当するため一時保持は不要になる

#### コンテキストで提供されるAPI（useCsvSheets フック）

| API | 説明 |
|-----|------|
| `sheetMetas` | 全シートのメタデータ配列 `{ id, name }[]` |
| `addSheet(sheet)` | 新しいシートを追加（メタ登録 + スコープ作成 + 一時保持） |
| `deleteSheet(sheetId)` | シートを削除（メタ削除 + スコープ削除） |
| `updateSheetMeta(sheetId, name)` | シート名の更新（一覧表示用） |

#### プロバイダー階層

```
DomainRegistryProvider（ドメインオブジェクト定義を提供）
  └─ CsvSheetInner（グローバルスコープ useCasScope("csv-importer") を使用）
       └─ CsvSheetContext.Provider（子コンポーネントにAPIを提供）
```

---

## 3. Redux Slice（csv-importer-libs/slice）

### `src/slice/csv-importer-slice.ts`

**役割**: 現在は世界線グラフに置き換えられたが、将来的な非バージョン管理データ用に残存。

**注意**: シートデータの保存・取得は世界線グラフ（CAS + IndexedDB）が担当するようになったため、このスライスのアクション・セレクターはSheetEditorFeature/SheetListFeatureからは使用されなくなった。

---

## 4. UIコンポーネント（csv-importer-libs/ui）

### `src/ui/WorldLineView.tsx`

**役割**: 世界線グラフのDAGツリーを表示する汎用コンポーネント。sekaisen-igo-libsの同名コンポーネントと同じ設計。

#### 受け取るプロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `graph` | `WorldLineGraph` | 表示する世界線グラフ |
| `onSelectNode` | `(nodeId) => void` | ノードクリック時（そのノードに移動） |
| `onSelectNodeAndClose` | `(nodeId) => void` | ノードダブルクリック時（移動＋バブルを閉じる） |
| `renderNodeSummary` | `(nodeId) => string` | ノードの要約テキスト（例: "3列 5行"） |

#### キーボード操作

| キー | 動作 |
|------|------|
| Ctrl/Cmd+Z | 親ノードに移動（undo） |
| Ctrl/Cmd+Shift+Z | 子ノードに移動（redo、同じ世界線を優先） |
| ArrowLeft | 親ノードに移動 |
| ArrowRight | 子ノードに移動 |

#### 表示

- 各世界線（worldLineId）に異なる色を割り当て
- 現在のノード（apex）はハイライト表示 + 「現在」バッジ
- DAGのインデントで分岐を表現

---

### `src/ui/SheetListView.tsx`

**役割**: シート一覧の見た目を担当する。データの取得方法は知らない（propsで受け取る）。

#### 受け取るプロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `sheets` | `SheetListItem[]` | 表示するシートの配列（`{ id, name }`） |
| `buildSheetUrl` | `(sheetId) => string` | シートのバブルURLを生成する関数 |
| `onSheetClick` | `(sheetId) => void` | シートクリック時のコールバック |
| `onCreateSheet` | `() => void` | 「新規作成」ボタン押下時 |
| `onImportCsv` | `(name, csvText) => void` | CSVインポート完了時 |

#### 画面構成

```
┌─────────────────────────────┐
│ [+ 新規作成] [CSVインポート]  │  ← アクションボタン
├─────────────────────────────┤
│ 📊 スタッフ一覧              │  ← シートカード（ObjectViewでラップ）
├─────────────────────────────┤     ドラッグ&ドロップ対応
│ 📊 予算表                   │
└─────────────────────────────┘
```

「CSVインポート」ボタンの処理:
1. `<input type="file">` を動的に生成してクリック
2. ユーザーがCSVファイルを選択
3. `FileReader` でテキストとして読み込み
4. ファイル名（.csv除去）とテキスト内容を `onImportCsv` コールバックに渡す

---

### `src/ui/SheetEditorView.tsx`

**役割**: スプレッドシート風のテーブルエディタ。セルのインライン編集を提供する。

#### 受け取るプロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `sheetName` | `string` | シート名（タイトル表示） |
| `columns` | `CsvColumnState[]` | 列の定義 |
| `rows` | `CsvRowState[]` | 行データ |
| `onUpdateCell` | `(rowId, columnId, value) => void` | セル値変更時 |
| `onRenameColumn` | `(columnId, name) => void` | 列名変更時 |
| `onAddRow` | `() => void` | 行追加時 |
| `onDeleteRow` | `(rowId) => void` | 行削除時 |
| `onAddColumn` | `(name) => void` | 列追加時 |
| `onDeleteColumn` | `(columnId) => void` | 列削除時 |
| `onOpenWorldLine` | `() => void` | 右上の「世界線」ボタン押下時（省略可能） |

#### 画面構成

```
┌─────────────────────────────────────────────┐
│ スタッフ一覧                    [世界線] │  ← シート名 + 右上に世界線ボタン
├────┬──────────┬──────────────────┬─────┬─────┤
│ #  │ 名前   × │ メール         × │ + ← │     │  ← ヘッダー行（クリックで編集、×で削除、+で追加）
├────┼──────────┼──────────────────┼─────┼─────┤
│ 1  │ 田中     │ tanaka@ex.com   │     │  ×  │  ← データ行（クリックで編集、×で削除）
├────┼──────────┼──────────────────┼─────┼─────┤
│ 2  │ 鈴木     │ suzuki@ex.com   │     │  ×  │
└────┴──────────┴──────────────────┴─────┴─────┘
│ [+ 行を追加]                                 │
└─────────────────────────────────────────────┘
```

#### キーボード操作

| キー | 動作 |
|------|------|
| クリック | そのセル/ヘッダーを編集モードにする |
| Enter | 編集を確定して編集モードを終了 |
| Escape | 編集を破棄して編集モードを終了 |
| Tab | 編集を確定 → 右隣のセルへ移動（行末なら次の行の先頭へ） |
| Ctrl+S / Cmd+S | 編集中のセルを確定（ブラウザのデフォルト保存を防止） |

#### 編集の確定フロー（commitEditing関数）

```
セルクリック → editingCell に記録 + inputにフォーカス
    ↓
ユーザーが文字を入力 → editValue が更新
    ↓
Enter / Tab / 別のセルクリック / Blur
    ↓
commitEditing() が呼ばれる
    ↓
onUpdateCell(rowId, columnId, editValue) が呼ばれる
    ↓
Feature層 → shell.update() → 世界線に自動コミット → 画面再描画
```

---

## 5. Feature層（csv-importer-libs/feature）

### `src/feature/WorldLineFeature.tsx`

**役割**: WorldLineView（見た目）と世界線グラフ（データ）を橋渡しする。囲碁の`WorldLineFeature`と同じパターン。

#### やっていること

1. `useCasScope(sheetScopeId(sheetId))` でシートの世界線スコープに接続
2. `scope.moveTo(nodeId)` でノード選択時に世界線を移動
3. ダブルクリック時はノード移動 + `removeBubble(bubbleId)` でバブルを閉じる
4. `renderNodeSummary` でノードの要約を生成（`"3列 5行"` のような表示）

---

### `src/feature/SheetListFeature.tsx`

**役割**: SheetListView（見た目）と世界線グラフ（データ）を橋渡しする。

#### やっていること

1. `useCsvSheets()` でシートメタデータ一覧と操作関数を取得
2. `useContext(BubblesContext)` でバブル操作関数を取得
3. 各コールバックを実装:

| コールバック | 処理内容 |
|------------|---------|
| `handleCreateSheet` | `CsvSheet.create(...)` で新シートを作成 → `addSheet(sheet)` でメタ登録+スコープ作成 → `openBubble(...)` でエディタバブルを開く |
| `handleImportCsv` | `CsvSheet.fromCsvText(...)` でCSVをパース → `addSheet(sheet)` → エディタバブルを開く |
| `handleSheetClick` | 親コンポーネントに通知するだけ |

---

### `src/feature/SheetEditorFeature.tsx`

**役割**: SheetEditorView（見た目）と世界線グラフ（データ）を橋渡しする。**セル編集ごとに自動コミット**。

#### Props

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `sheetId` | `string` | 表示・編集するシートのID |
| `bubbleId` | `string?` | バブルID（世界線ビューをpopChildで開くために必要） |

#### やっていること

1. `getInitialSheet(sheetId)` で初期CsvSheetを取得（pendingがあればそれを使用、なければフォールバックでデフォルトシートを生成。**フォールバック時のidはsheetIdと一致させる**）
2. `useCasScope(sheetScopeId(sheetId), { initialObjects })` でシート専用の世界線スコープを取得
3. `scope.getShell<CsvSheet>("csv-sheet", sheetId)` でシートのシェルを取得
4. 「世界線」ボタン押下時に `openBubble("csv-importer/sheets/{sheetId}/history", bubbleId)` で世界線ビューをpopChild
5. 各操作を `shell.update()` で自動コミット:

| UIからのコールバック | shell.update()の中身 |
|-------------------|---------------------|
| `handleUpdateCell(rowId, colId, value)` | `s.updateCell(rowId, colId, value)` |
| `handleRenameColumn(colId, name)` | `s.renameColumn(colId, name)` |
| `handleAddRow()` | `s.addRow()` |
| `handleDeleteRow(rowId)` | `s.deleteRow(rowId)` |
| `handleAddColumn(name)` | `s.addColumn(name)` |
| `handleDeleteColumn(colId)` | `s.deleteColumn(colId)` |

**shell.update()の仕組み**:
```typescript
sheetShell.update((s) => s.updateCell(rowId, columnId, value));
//                  ↑ 現在のCsvSheet    ↑ 新しいCsvSheetを返す
// → 世界線グラフに新しいノードが自動追加される（コミット）
// → CASにハッシュベースで保存される
```

---

## 6. アプリ設定（csv-importer-app）

### `src/registration/bubbleRoutes.tsx`

**役割**: URLパターンと画面コンポーネントの対応を定義する。

| URLパターン | 表示する画面 | パラメータ |
|------------|------------|-----------|
| `csv-importer/sheets` | SheetListFeature（シート一覧） | なし |
| `csv-importer/sheets/:sheetId` | SheetEditorFeature（シート編集） | `sheetId` |
| `csv-importer/sheets/:sheetId/history` | WorldLineFeature（世界線ビュー） | `sheetId` |

---

### `src/app/app.tsx`

**役割**: スタンドアロンモードでのアプリ全体の組み立て。

処理の順序:
1. `import TableChartIcon` — サイドバー用のMUIアイコンをインポート
2. `initWorldLineGraph()` — 世界線グラフのReduxスライスとミドルウェアを注入
3. `import '@bublys-org/csv-importer-libs'` — csvImporterスライス注入（副作用）
4. `BubbleRouteRegistry.registerRoutes(...)` — バブルルートを登録
5. `menuItems` — サイドバーに「シート一覧」メニューを定義（`TableChartIcon`アイコン付き）

プロバイダー階層:
```
BublyStoreProvider（Reduxストア初期化 + redux-persist）
  └─ CsvSheetProvider（世界線グラフ + ドメインオブジェクト登録）
       └─ BublyApp（サイドバー + バブル表示エリア）
```

---

### `src/bubly.ts`

**役割**: bublys-os（メインアプリ）から動的にロードされるバブリとしての登録。

```typescript
const CsvImporterBubly: Bubly = {
  name: "csv-importer",
  version: "0.0.1",
  menuItems: [
    {
      label: "シート一覧",
      url: "csv-importer/sheets",
      icon: React.createElement(TableChartIcon, { color: "action" }),
    },
  ],
  register(context) {
    context.registerBubbleRoutes(csvImporterBubbleRoutes);
  },
  unregister() {},
};
```

---

## ファイル一覧（実装したもののみ）

```
csv-importer-model/
  src/lib/
    CsvSheet.ts           ← ドメインモデル（データ構造と操作）
    CsvSheet.test.ts      ← テスト（16ケース）
    index.ts              ← エクスポート定義
  src/index.ts            ← パッケージエントリポイント
  jest.config.ts          ← テスト設定
  .spec.swcrc             ← テスト用コンパイル設定

csv-importer-libs/
  src/slice/
    csv-importer-slice.ts ← Reduxスライス（将来的な非バージョン管理データ用に残存）
    index.ts              ← エクスポート定義
  src/ui/
    SheetListView.tsx     ← シート一覧の見た目
    SheetEditorView.tsx   ← シート編集の見た目（スプレッドシート風、右上に世界線ボタン）
    WorldLineView.tsx     ← 世界線グラフのDAGツリー表示（汎用）
    index.ts              ← エクスポート定義
  src/feature/
    CsvSheetProvider.tsx  ← 世界線グラフ統合プロバイダー（ドメイン登録 + スコープ管理 + pendingSheets）
    SheetListFeature.tsx  ← シート一覧の世界線グラフ接続
    SheetEditorFeature.tsx← シート編集の世界線グラフ接続（セル編集ごとに自動コミット + 世界線ビュー起動）
    WorldLineFeature.tsx  ← 世界線ビューの世界線グラフ接続（ノード移動・要約表示）
    index.ts              ← エクスポート定義
  src/index.ts            ← パッケージエントリポイント

csv-importer-app/
  src/registration/
    bubbleRoutes.tsx      ← URLと画面の対応定義
  src/app/
    app.tsx               ← スタンドアロンアプリの組み立て（initWorldLineGraph + CsvSheetProvider）
  src/
    bubly.ts              ← メインアプリ組み込み用の登録
```

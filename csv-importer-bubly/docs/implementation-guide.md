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

データの流れ:

```
ユーザーがセルをクリックして編集
        ↓
UI層（SheetEditorView）がコールバックを呼ぶ
        ↓
Feature層（SheetEditorFeature）がReduxアクションを発行
        ↓
Slice（csv-importer-slice）がストア内のデータを更新
        ↓
画面が自動的に再描画される
```

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
| `sheet.toJSON()` | Redux保存用のプレーンオブジェクトに変換 | CsvSheetState |
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

## 2. Redux Slice（csv-importer-libs/slice）

### `src/slice/csv-importer-slice.ts`

**役割**: アプリの「中央データベース」にCSVシートのデータを保存・更新・取得するための仕組み。

#### ストアの状態構造

```typescript
{
  csvImporter: {
    sheets: {
      "sheet-id-1": { id: "sheet-id-1", name: "スタッフ一覧", columns: [...], rows: [...], ... },
      "sheet-id-2": { id: "sheet-id-2", name: "予算表", columns: [...], rows: [...], ... },
    }
  }
}
```

#### アクション（データを変更する操作）

| アクション | 引数 | 何をするか |
|-----------|------|----------|
| `setSheet(sheetState)` | シート全体のデータ | シートを追加 or 上書き保存 |
| `deleteSheet(sheetId)` | シートID | シートを削除 |
| `updateCell({sheetId, rowId, columnId, value})` | 4つの値 | 特定セルの値を更新 |
| `addRow(sheetId)` | シートID | 空行を末尾に追加 |
| `deleteRow({sheetId, rowId})` | シートIDと行ID | 行を削除 |
| `addColumn({sheetId, columnName})` | シートIDと列名 | 列を末尾に追加 |
| `deleteColumn({sheetId, columnId})` | シートIDと列ID | 列を削除 |
| `renameColumn({sheetId, columnId, name})` | シートID、列ID、新名 | 列名を変更 |

#### セレクター（データを取得する関数）

| セレクター | 戻り値 | 説明 |
|-----------|--------|------|
| `selectCsvSheetList` | `CsvSheet[]` | 全シートをドメインオブジェクトの配列で返す |
| `selectCsvSheetById(sheetId)` | `CsvSheet \| undefined` | 指定IDのシートを返す（なければundefined） |

セレクターは生のJSONデータを`CsvSheet.fromJSON()`で**ドメインオブジェクトに変換して返す**。
これにより、UI側では`sheet.name`のようにドメインモデルのAPIを使える。

#### スライス注入パターン

```typescript
// 1. LazyLoadedSlices インターフェースを拡張（型を追加）
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof csvImporterSlice> {}
}

// 2. rootReducerに注入（このファイルがimportされた瞬間に実行される）
csvImporterSlice.injectInto(rootReducer);
```

この仕組みにより、`import '@bublys-org/csv-importer-libs'` と書くだけで
自動的にReduxストアにcsvImporterスライスが追加される。

---

## 3. UIコンポーネント（csv-importer-libs/ui）

### `src/ui/SheetListView.tsx`

**役割**: シート一覧の見た目を担当する。データの取得方法は知らない（propsで受け取る）。

#### 受け取るプロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `sheets` | `CsvSheet[]` | 表示するシートの配列 |
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
│    3列 / 15行               │     ドラッグ&ドロップ対応
├─────────────────────────────┤
│ 📊 予算表                   │
│    5列 / 8行                │
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
| `onSave` | `() => void` | Ctrl+S押下時（世界線コミット用） |

#### 画面構成

```
┌─────────────────────────────────────────────┐
│ スタッフ一覧                                 │  ← シート名
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

#### 内部の状態管理

```typescript
editingCell    // 今どのセルを編集中か（{ rowId, columnId } or null）
editingHeader  // 今どのヘッダーを編集中か（{ columnId } or null）
editValue      // 編集中の入力値（文字列）
```

#### キーボード操作

| キー | 動作 |
|------|------|
| クリック | そのセル/ヘッダーを編集モードにする |
| Enter | 編集を確定して編集モードを終了 |
| Escape | 編集を破棄して編集モードを終了 |
| Tab | 編集を確定 → 右隣のセルへ移動（行末なら次の行の先頭へ） |
| Ctrl+S / Cmd+S | 編集中のセルを確定 → `onSave`コールバックを呼ぶ |

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
Feature層 → Redux → 画面再描画
```

---

## 4. Feature層（csv-importer-libs/feature）

### `src/feature/SheetListFeature.tsx`

**役割**: SheetListView（見た目）とReduxストア（データ）を橋渡しする。

#### やっていること

1. `useAppSelector(selectCsvSheetList)` でストアからシート一覧を取得
2. `useContext(BubblesContext)` でバブル操作関数を取得
3. 各コールバックを実装:

| コールバック | 処理内容 |
|------------|---------|
| `handleCreateSheet` | `CsvSheet.create("新しいシート", ["列1","列2","列3"])` で新シートを作成 → `dispatch(setSheet(...))` でストアに保存 → `openBubble(...)` でエディタバブルを開く |
| `handleImportCsv` | `CsvSheet.fromCsvText(name, csvText)` でCSVをパース → ストア保存 → エディタバブルを開く |
| `handleSheetClick` | 親コンポーネントに通知するだけ |

---

### `src/feature/SheetEditorFeature.tsx`

**役割**: SheetEditorView（見た目）とReduxストア（データ）を橋渡しする。

#### やっていること

1. `useAppSelector(selectCsvSheetById(sheetId))` で該当シートを取得
2. 各操作を `useCallback` でメモ化してReduxアクションに変換:

| UIからのコールバック | ディスパッチするアクション |
|-------------------|------------------------|
| `handleUpdateCell(rowId, colId, value)` | `updateCell({ sheetId, rowId, columnId, value })` |
| `handleRenameColumn(colId, name)` | `renameColumn({ sheetId, columnId, name })` |
| `handleAddRow()` | `addRow(sheetId)` |
| `handleDeleteRow(rowId)` | `deleteRow({ sheetId, rowId })` |
| `handleAddColumn(name)` | `addColumn({ sheetId, columnName: name })` |
| `handleDeleteColumn(colId)` | `deleteColumn({ sheetId, columnId })` |

シートが見つからない場合は「シートが見つかりません」と表示。

---

## 5. アプリ設定（csv-importer-app）

### `src/registration/bubbleRoutes.tsx`

**役割**: URLパターンと画面コンポーネントの対応を定義する。

| URLパターン | 表示する画面 | パラメータ |
|------------|------------|-----------|
| `csv-importer/sheets` | SheetListFeature（シート一覧） | なし |
| `csv-importer/sheets/:sheetId` | SheetEditorFeature（シート編集） | `sheetId` |

各バブルコンポーネントの処理:

**SheetListBubble**:
- SheetListFeatureを表示
- シートが選択されたら `openBubble("csv-importer/sheets/{sheetId}")` でエディタバブルを開く

**SheetEditorBubble**:
- URLから `bubble.params.sheetId` を取得
- SheetEditorFeatureに渡して表示

---

### `src/app/app.tsx`

**役割**: スタンドアロンモードでのアプリ全体の組み立て。

処理の順序:
1. `import TableChartIcon` — サイドバー用のMUIアイコンをインポート
2. `import '@bublys-org/csv-importer-libs'` — **副作用**でReduxスライスが注入される
3. `BubbleRouteRegistry.registerRoutes(...)` — バブルルートを登録
4. `menuItems` — サイドバーに「シート一覧」メニューを定義（`TableChartIcon`アイコン付き）
5. `BublyStoreProvider` — Reduxストアを初期化（`persistKey`でlocalStorageに永続化）
6. `BublyApp` — バブルUIのシェル（サイドバー + メインエリア）を描画

起動時に `csv-importer/sheets` バブルが自動で開く（`initialBubbleUrls`）。

---

### `src/bubly.ts`

**役割**: bublys-os（メインアプリ）から動的にロードされるバブリとしての登録。

スタンドアロンモード（app.tsx）とは別に、メインアプリに組み込まれる場合のエントリポイント。

```typescript
const CsvImporterBubly: Bubly = {
  name: "csv-importer",       // バブリの識別名
  version: "0.0.1",
  menuItems: [                 // メインアプリのサイドバーに追加されるメニュー
    {
      label: "シート一覧",
      url: "csv-importer/sheets",
      icon: React.createElement(TableChartIcon, { color: "action" }),
    },
  ],
  register(context) {          // バブリ登録時に呼ばれる
    context.registerBubbleRoutes(csvImporterBubbleRoutes);
  },
  unregister() {},             // バブリ解除時のクリーンアップ（今は空）
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
    csv-importer-slice.ts ← Reduxスライス（データ保存・更新・取得）
    index.ts              ← エクスポート定義
  src/ui/
    SheetListView.tsx     ← シート一覧の見た目
    SheetEditorView.tsx   ← シート編集の見た目（スプレッドシート風）
    index.ts              ← エクスポート定義
  src/feature/
    SheetListFeature.tsx  ← シート一覧のRedux接続
    SheetEditorFeature.tsx← シート編集のRedux接続
    index.ts              ← エクスポート定義
  src/index.ts            ← パッケージエントリポイント

csv-importer-app/
  src/registration/
    bubbleRoutes.tsx      ← URLと画面の対応定義
  src/app/
    app.tsx               ← スタンドアロンアプリの組み立て
  src/
    bubly.ts              ← メインアプリ組み込み用の登録
```

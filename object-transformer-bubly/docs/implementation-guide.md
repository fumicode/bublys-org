# Object Transformer 実装ガイド

このドキュメントでは、Object Transformerバブリの実装内容を説明します。
自動生成されたファイル（package.json、tsconfig.json、vite.config.mts など）は除き、
**手書きで実装したファイル**のみを対象にしています。

---

## 全体像

Object Transformerは3つのパッケージで構成されています:

```
object-transformer-model/   ← 変換ルールの「形」と「操作」を定義（純粋なTypeScript）
object-transformer-libs/    ← 画面の部品と、ルールの保存・読み出しロジック
object-transformer-app/     ← 上記をまとめてアプリとして動かす設定
```

データの流れ:

```
csv-importerでPlaneObjectをドラッグ
        ↓ application/json（DnD）
左パネル（SourcePanel）にドロップ → プロパティがドラッグ可能なchipとして表示
        ↓
右パネル（TargetPanel）にスキーマのスロット表示（現在はStaff_スタッフ固定）
        ↓
左のchipを右のスロットにドラッグ → FieldMappingが作成される
        ↓
suggestMappingsが自動推定 → 提案として表示
        ↓
ルール保存 → Redux（objectTransformerスライス）→ localStorage永続化
        ↓
一括変換: applyMappingRule(PlaneObject[], rule) → Record<string, unknown>[]
```

**ポイント**: csv-importerはPlaneObjectをドラッグ時に`application/json`としてJSONを渡すだけ。object-transformerの詳細を一切知らない疎結合な設計。

---

## 1. ドメインモデル（object-transformer-model）

### `src/lib/DomainSchema.ts`

**役割**: 変換先ドメインオブジェクトのスキーマを定義する。ReactやReduxには一切依存しない、純粋なTypeScriptコード。

#### データの型

```typescript
// プロパティの値の型
type PropertyType = "string" | "number" | "boolean" | "enum";

// スキーマの1プロパティ
type SchemaProperty = {
  readonly name: string;        // 内部名（"name", "email"）
  readonly type: PropertyType;  // 値の型
  readonly required: boolean;   // 必須かどうか
  readonly enumValues?: string[];  // enum型の場合の選択肢
  readonly label?: string;      // 表示用ラベル（"名前", "メール"）
};

// スキーマ全体の情報
type DomainSchemaState = {
  readonly id: string;         // スキーマID
  readonly name: string;       // 表示名（"Staff_スタッフ"）
  readonly properties: SchemaProperty[];  // プロパティ定義の配列
};
```

#### DomainSchemaクラスの主要メソッド

| メソッド / プロパティ | 説明 | 戻り値 |
|---------|------|--------|
| `schema.id` | スキーマID | string |
| `schema.name` | 表示名 | string |
| `schema.properties` | 全プロパティ | SchemaProperty[] |
| `schema.getProperty(name)` | 名前でプロパティを検索 | SchemaProperty \| undefined |
| `schema.requiredProperties` | 必須プロパティのみ | SchemaProperty[] |
| `schema.toJSON()` | プレーンオブジェクトに変換 | DomainSchemaState |
| `DomainSchema.fromJSON(json)` | プレーンオブジェクトから復元 | DomainSchema |

---

### `src/lib/MappingRule.ts`

**役割**: PlaneObject → ドメインオブジェクトの変換ルール（マッピングの集合）を定義する。

#### データの型

```typescript
// 値の変換方法
type ValueTransform =
  | { type: "identity" }                           // そのまま
  | { type: "toNumber" }                           // 数値に変換
  | { type: "toBoolean"; trueValues: string[] }    // 真偽値に変換
  | { type: "dictionary"; map: Record<string, string> };  // 辞書で変換

// 1フィールドのマッピング
type FieldMapping = {
  readonly sourceKey: string;       // PlaneObjectのキー（列名）
  readonly targetProperty: string;  // スキーマのプロパティ名
  readonly transform: ValueTransform;  // 変換方法
};

// マッピングルール全体の情報
type MappingRuleState = {
  readonly id: string;
  readonly name: string;             // ルール名（ユーザーが命名）
  readonly targetSchemaId: string;   // 変換先スキーマのID
  readonly mappings: FieldMapping[];  // マッピングの配列
  readonly createdAt: string;
  readonly updatedAt: string;
};
```

#### MappingRuleクラスの主要メソッド

| メソッド | 説明 | 戻り値 |
|---------|------|--------|
| `MappingRule.create(name, schemaId, mappings?)` | 新しいルールを作成 | MappingRule |
| `rule.addMapping(mapping)` | マッピングを追加（同じtargetなら上書き） | 新しいMappingRule |
| `rule.removeMapping(targetProperty)` | マッピングを削除 | 新しいMappingRule |
| `rule.getMappingForTarget(targetProperty)` | ターゲットでマッピングを検索 | FieldMapping \| undefined |
| `rule.getMappingForSource(sourceKey)` | ソースでマッピングを検索 | FieldMapping \| undefined |
| `rule.mappedSourceKeys` | マッピング済みのソースキー一覧 | string[] |
| `rule.mappedTargetProperties` | マッピング済みのターゲットプロパティ一覧 | string[] |
| `rule.toJSON()` / `MappingRule.fromJSON(json)` | シリアライズ / デシリアライズ | |

**重要な設計原則: 不変性（イミュータビリティ）**

すべてのメソッドは**元のルールを変更せず、新しいルールを返す**。

```typescript
const original = MappingRule.create("テスト", "staff-schema");
const updated = original.addMapping(mapping);

// originalは変わっていない！
original.mappings.length  // → 0
updated.mappings.length   // → 1
```

---

### `src/lib/transform.ts`

**役割**: PlaneObject配列をMappingRuleに従って変換する実行ロジック。

#### PlaneObjectLike型

```typescript
type PlaneObjectLike = {
  id: string;
  name: string;
  [key: string]: string;
};
```

csv-importer-modelの`PlaneObject`型と互換性を持つ最小定義。object-transformer-modelがcsv-importer-modelに依存しないようにするため、独自に定義。

#### 関数一覧

| 関数 | 説明 |
|------|------|
| `applyTransform(value, transform)` | 単一値を変換（identity/toNumber/toBoolean/dictionary） |
| `applyMappingRule(planeObjects, rule)` | PlaneObject[] × MappingRule → Record<string, unknown>[] |

**変換例:**

```typescript
// ソース: { id: "1", name: "田中", 名前: "田中太郎", 年齢: "25" }
// ルール: [{ sourceKey: "名前", targetProperty: "name", transform: identity },
//          { sourceKey: "年齢", targetProperty: "age", transform: toNumber }]
// → 結果: { name: "田中太郎", age: 25 }
```

---

### `src/lib/suggest.ts`

**役割**: ソースキー（PlaneObjectのプロパティ名）とスキーマのプロパティからマッピング候補を自動推定する。

#### スコアリングロジック

| 条件 | スコア |
|------|-------|
| 完全一致（大文字小文字無視）: `sourceKey === property.name` | +10 |
| ラベルとの完全一致: `sourceKey === property.label` | +10 |
| エイリアス辞書一致: `"名前" → name` | +8 |
| 値パターン一致: メールアドレス形式 → email | +5 |
| 値パターン一致: 電話番号形式 → phone | +5 |

#### 組み込みエイリアス辞書

```typescript
const ALIAS_DICTIONARY = {
  name: ["名前", "氏名", "Name", "お名前"],
  furigana: ["フリガナ", "ふりがな", "カナ", "読み"],
  email: ["メール", "メールアドレス", "Email", "E-mail", "Eメール"],
  phone: ["電話", "電話番号", "Tel", "Phone", "携帯"],
  school: ["学校", "大学", "School", "学校名"],
  grade: ["学年", "Grade", "年次"],
  gender: ["性別", "Gender"],
  notes: ["備考", "メモ", "Notes", "コメント", "その他"],
  address: ["住所", "Address", "所在地"],
  age: ["年齢", "Age"],
  department: ["部署", "Department", "学部"],
};
```

#### アルゴリズム

1. 全ソースキー × 全プロパティの組み合わせでスコアを計算
2. スコア降順でソート
3. **貪欲法**: 各ソースキーとターゲットプロパティは1つずつしか使わない（1:1マッピング）
4. 型に応じてtransformを自動推定（number型→toNumber, boolean型→toBoolean）

---

### `src/lib/validate.ts`

**役割**: マッピングの妥当性チェック。サンプル値が存在する場合に型との適合性を検証する。

```typescript
type ValidationResult = { valid: boolean; errors: string[] };

function validateMapping(
  sourceKey: string,
  targetProperty: SchemaProperty,
  sampleValue?: string,
): ValidationResult
```

| ターゲット型 | チェック内容 |
|------------|------------|
| number | サンプル値が`Number()`で変換可能か |
| boolean | チェックなし（任意の文字列から変換可能） |
| enum | サンプル値が`enumValues`に含まれるか |
| string | チェックなし（なんでもOK） |

---

### `src/lib/schemas/staff-schema.ts`

**役割**: ハードコードのスタッフスキーマ（初期実装用）。

```typescript
const STAFF_SCHEMA = new DomainSchema({
  id: "staff-schema",
  name: "Staff_スタッフ",
  properties: [
    { name: "name",     type: "string",  required: true,  label: "名前" },
    { name: "furigana", type: "string",  required: true,  label: "フリガナ" },
    { name: "email",    type: "string",  required: true,  label: "メール" },
    { name: "phone",    type: "string",  required: true,  label: "電話" },
    { name: "school",   type: "string",  required: true,  label: "学校" },
    { name: "grade",    type: "string",  required: true,  label: "学年" },
    { name: "gender",   type: "enum",    required: true,  label: "性別",
      enumValues: ["male", "female", "other", "prefer_not_to_say"] },
    { name: "notes",    type: "string",  required: false, label: "備考" },
  ],
});
```

※ ネスト（skills, presentation等）は初期実装では省略。

---

### テストファイル

#### `src/lib/transform.test.ts`

**役割**: transform関数の動作を自動テストで検証する。10個のテストケース。

| テストカテゴリ | テスト内容 |
|--------------|----------|
| applyTransform | identity変換がそのまま返す / toNumberで数値変換 / 非数値は元文字列を返す |
| applyTransform | toBooleanで真の値にtrue / 真でない値にfalse |
| applyTransform | dictionary変換で既知の値をマップ / 未知の値はそのまま |
| applyMappingRule | PlaneObject配列をルールで正しく変換 / 未定義ソースキーはスキップ / 空配列 |

#### `src/lib/suggest.test.ts`

**役割**: suggestMappings関数の動作を自動テストで検証する。7個のテストケース。

| テストカテゴリ | テスト内容 |
|--------------|----------|
| 完全一致 | プロパティ名の大文字小文字無視マッチ |
| エイリアス | 辞書経由でマッチ（名前→name, メールアドレス→email等） |
| ラベル | ラベルとの一致（フリガナ→furigana, 学年→grade） |
| 値パターン | メールアドレス形式の値でemail推定 |
| 重複防止 | 同じターゲットに2つのソースが競合した場合1つだけ選ばれる |
| 不一致 | マッチなしの場合は空配列 |
| 型推定 | number型プロパティにtoNumber transformが設定される |

---

## 2. Redux Slice（object-transformer-libs/slice）

### `src/slice/transformer-slice.ts`

**役割**: MappingRuleの保存・更新・削除をReduxで管理する。

#### スライスの状態

```typescript
type TransformerState = {
  rules: MappingRuleState[];  // 保存済みルールの配列
};
```

#### アクション

| アクション | ペイロード | 説明 |
|-----------|----------|------|
| `addRule` | `MappingRuleState` | ルールを追加 |
| `updateRule` | `MappingRuleState` | 既存ルールを更新（idで検索） |
| `deleteRule` | `string`（ruleId） | ルールを削除 |

#### セレクター

| セレクター | 戻り値 | 説明 |
|-----------|--------|------|
| `selectTransformerRules` | `MappingRuleState[]` | 全ルール一覧 |
| `selectTransformerRuleById(ruleId)` | `MappingRuleState \| undefined` | IDでルール検索 |

#### 遅延注入パターン

```typescript
// rootReducerに遅延注入
transformerSlice.injectInto(rootReducer);

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof transformerSlice> {}
}
```

このスライスはバブリが読み込まれた時点（`import "@bublys-org/object-transformer-libs"`の副作用）で自動的にrootReducerに注入される。

**注意**: バブリ読み込み前にlocalStorageに`objectTransformer`キーのデータが存在すると、Redux Persistが "Unexpected key 'objectTransformer'" の警告を出す。バブリ読み込み後のリロードで解消される。

---

## 3. UIコンポーネント（object-transformer-libs/ui）

### `src/ui/MappingEditorView.tsx`

**役割**: メインのマッピングエディタUI。左右2カラムレイアウトでSourcePanelとTargetPanelを表示する。

#### 画面構成

```
┌─────────── ソース（PlaneObject） ──────────┐   ┌──────── ターゲット（ドメインオブジェクト） ──────┐
│                                            │   │                                               │
│ [PlaneObject DropZone]                     │   │ [ドメインオブジェクト DropZone]                  │
│                                            │   │                                               │
│ ドロップ後:                                  │   │ ドロップ後:                                     │
│  田中太郎                          [変更]   │   │  Staff_スタッフ                        [変更]   │
│  ┌──────────────────────────────┐  │   │  ┌──────────────────────────────────┐    │
│  │ 名前    田中太郎              │  │   │  │ 名前 (string *) [ドロップスロット]  │    │
│  │ メール  tanaka@example.com   │  │   │  │ メール (string *) [提案: メール]    │    │
│  │ 電話    090-xxxx-xxxx  mapped│  │   │  │ 電話 (string *) [mapped: 電話]     │    │
│  └──────────────────────────────┘  │   │  └──────────────────────────────────┘    │
└────────────────────────────────────────────┘   └───────────────────────────────────────────────┘

┌─────────────────────── 提案バー ────────────────────────────────────────────────┐
│ 3件の提案があります                                                [すべて適用]  │
└────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────── 保存バー ────────────────────────────────────────────────┐
│ [ルール名を入力...]                                            [ルールを保存]    │
└────────────────────────────────────────────────────────────────────────────────┘
```

#### 受け取るプロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `sourceObject` | `PlaneObjectLike \| null` | ソースオブジェクト（ドロップ前はnull） |
| `onDropSource` | `(e: React.DragEvent) => void` | ソースドロップ時 |
| `onDragOverSource` | `(e: React.DragEvent) => void` | ソースドラッグオーバー時 |
| `schemaName` | `string \| null` | ターゲットスキーマ名 |
| `targetProperties` | `SchemaProperty[]` | ターゲットプロパティ一覧 |
| `targetSampleValues` | `Record<string, string>` | 元の値（背景表示用） |
| `onDropTarget` | `(e: React.DragEvent) => void` | ターゲットドロップ時 |
| `onDragOverTarget` | `(e: React.DragEvent) => void` | ターゲットドラッグオーバー時 |
| `mappings` | `FieldMapping[]` | 現在のマッピング |
| `suggestions` | `FieldMapping[]` | 自動推定の提案 |
| `onMapField` | `(sourceKey, targetProperty) => void` | マッピング作成 |
| `onUnmapField` | `(targetProperty) => void` | マッピング解除 |
| `onAcceptSuggestion` | `(targetProperty) => void` | 提案を受諾 |
| `onSaveRule` | `(name) => void` | ルール保存 |
| `onAcceptAllSuggestions` | `() => void` | 全提案を一括受諾 |

#### 内部フィールドDnD

パネル間のフィールドドラッグには独自MIMEタイプ `application/x-object-transformer-field` を使用。外部からのPlaneObjectドロップ（`application/json`）とは区別される。

---

### `src/ui/SourcePanel.tsx`

**役割**: 左パネル。PlaneObjectのプロパティ一覧を表示する。

#### 2つの表示状態

**未ドロップ状態**: 破線のDropZoneを表示（"PlaneObjectをここにドロップ"）
**ドロップ後**: 各プロパティのキーと値をドラッグ可能なchipとして表示

- `id`と`name`は除外（内部フィールドのため）
- マッピング済みのプロパティは`is-mapped`状態（opacity低下、ドラッグ不可、"mapped"バッジ表示）
- ヘッダー右に「変更」ミニDropZone（別のPlaneObjectに差し替え可能）

---

### `src/ui/TargetPanel.tsx`

**役割**: 右パネル。ドメインスキーマのプロパティスロットを表示する。

#### 2つの表示状態

**未ドロップ状態**: 破線のDropZone（"ドメインオブジェクトをここにドロップ"）
**ドロップ後**: 各プロパティがドロップスロットとして表示

#### プロパティスロットの3状態

| 状態 | 表示内容 |
|------|---------|
| マッピング済み | ソースキー名（青色チップ）+ ×解除ボタン |
| 提案あり | "提案: {ソースキー}" + 適用ボタン（黄色の点線枠） |
| 空 | サンプル値（薄灰色）+ "ドロップ" ヒント |

各スロットには `ラベル名` + `型 (*=必須)` がヘッダーに表示される。

---

### `src/ui/RuleListView.tsx`

**役割**: 保存済みMappingRuleの一覧を表示する。

#### 受け取るプロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `rules` | `MappingRuleState[]` | ルール一覧 |
| `onSelectRule` | `(ruleId) => void` | ルール選択時（一括変換画面へ遷移） |
| `onDeleteRule` | `(ruleId) => void` | ルール削除時 |
| `onNavigateToEditor` | `() => void` | 新規作成ボタン押下時 |

#### 画面構成

```
┌─────────────────────────────────────────────────┐
│ マッピングルール一覧                   [新規作成]  │
├─────────────────────────────────────────────────┤
│ CSVスタッフ変換                              ×   │
│   → staff-schema    5フィールド                  │
├─────────────────────────────────────────────────┤
│ テストルール                                 ×   │
│   → staff-schema    3フィールド                  │
└─────────────────────────────────────────────────┘
```

---

### `src/ui/BatchConvertView.tsx`

**役割**: 一括変換の実行UIと結果テーブルを表示する。

#### 受け取るプロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| `rule` | `MappingRuleState` | 変換に使用するルール |
| `sourceCount` | `number` | ソースPlaneObjectの件数 |
| `results` | `Record<string, unknown>[] \| null` | 変換結果（未実行時はnull） |
| `onConvert` | `() => void` | 変換実行ボタン押下時 |
| `onBack` | `() => void` | 戻るボタン押下時 |

#### 画面構成

```
┌─────────────────────────────────────────────────────┐
│ ← 戻る  一括変換: CSVスタッフ変換                     │
├─────────────────────────────────────────────────────┤
│ マッピング: 5フィールド / ソース: 10件   [変換実行]    │
├─────────────────────────────────────────────────────┤
│ 変換結果（10件）                                     │
│ ┌───┬──────┬─────────────┬──────┐                   │
│ │ # │ name │ email       │ age  │                   │
│ ├───┼──────┼─────────────┼──────┤                   │
│ │ 1 │ 田中 │ tanaka@..   │ 25   │                   │
│ │ 2 │ 鈴木 │ suzuki@..   │ 30   │                   │
│ └───┴──────┴─────────────┴──────┘                   │
└─────────────────────────────────────────────────────┘
```

---

## 4. Feature層（object-transformer-libs/feature）

### `src/feature/TransformerProvider.tsx`

**役割**: ドメインスキーマとマッピングルールをコンテキスト経由で子コンポーネントに提供する。

#### コンテキストで提供されるAPI（useTransformer フック）

| API | 型 | 説明 |
|-----|---|------|
| `schemas` | `DomainSchema[]` | 利用可能なスキーマ一覧（現在はSTAFF_SCHEMAのみ） |
| `getSchema(id)` | `(id) => DomainSchema \| undefined` | IDでスキーマを検索 |
| `rules` | `MappingRuleState[]` | 保存済みルール一覧（Redux経由） |
| `saveRule(rule)` | `(rule) => void` | ルールをReduxに保存 |
| `updateExistingRule(rule)` | `(rule) => void` | 既存ルールを更新 |
| `removeRule(ruleId)` | `(ruleId) => void` | ルールを削除 |

#### プロバイダー階層

```
TransformerProvider（Redux接続 + スキーマ管理）
  └─ TransformerContext.Provider（子コンポーネントにAPIを提供）
```

---

### `src/feature/MappingEditorFeature.tsx`

**役割**: MappingEditorView（見た目）とデータ操作を橋渡しする。メインのオーケストレーション層。

#### 管理する状態

| 状態 | 型 | 説明 |
|------|---|------|
| `sourceObject` | `PlaneObjectLike \| null` | ドロップされたPlaneObject |
| `targetSchemaId` | `string \| null` | 選択されたスキーマID |
| `targetSampleValues` | `Record<string, string>` | ターゲットの元の値 |
| `mappings` | `FieldMapping[]` | 現在のマッピング |
| `suggestions` | `FieldMapping[]` | 自動推定の提案 |

#### ソースドロップの処理

```
onDragOver: e.preventDefault() + dropEffect = "copy"
    ↓
onDrop: e.dataTransfer.getData("application/json") でJSONを取得
    ↓
JSON.parse → PlaneObjectLikeとしてセット
    ↓
ターゲットスキーマが既にあれば suggestMappings() を呼んで提案を生成
```

**csv-importerとの連携**: csv-importerのCsvObjectListView/CsvObjectDetailViewがドラッグ時に`application/json`としてPlaneObjectのJSONを設定しており、このFeatureがそれを受け取る。csv-importerの詳細は一切知らない。

#### ターゲットドロップの処理

現在はハードコードでSTAFF_SCHEMAを使用。ドロップイベント時に`setTargetSchemaId(STAFF_SCHEMA.id)`を呼び出す。

#### マッピング操作

| 操作 | 処理内容 |
|------|---------|
| `handleMapField(sourceKey, targetProperty)` | ターゲットの型に応じてtransformを自動決定 → FieldMapping作成 → 既存の同source/targetを除去して追加 |
| `handleUnmapField(targetProperty)` | 該当マッピングを削除 |
| `handleAcceptSuggestion(targetProperty)` | 提案をマッピングに昇格 |
| `handleAcceptAllSuggestions()` | 未適用の全提案をマッピングに一括昇格 |
| `handleSaveRule(name)` | MappingRule.create() → saveRule() でReduxに保存 |

---

### `src/feature/RuleListFeature.tsx`

**役割**: RuleListView（見た目）とRedux + バブルナビゲーションを橋渡しする。

| コールバック | 処理内容 |
|------------|---------|
| `handleSelectRule(ruleId)` | `openBubble("object-transformer/rules/{ruleId}/convert", bubbleId)` で一括変換バブルを開く |
| `handleDeleteRule(ruleId)` | `removeRule(ruleId)` でReduxからルールを削除 |
| `handleNavigateToEditor()` | `openBubble("object-transformer/editor", bubbleId)` でエディタバブルを開く |

---

### `src/feature/BatchConvertFeature.tsx`

**役割**: BatchConvertView（見た目）と変換実行ロジックを橋渡しする。

#### やっていること

1. `useTransformer()` から`rules`を取得し、`ruleId`でルールを検索
2. `usePlaneObjects()` でソースPlaneObject配列を取得（**現在はTODOプレースホルダーで空配列**）
3. 「変換実行」ボタンで `MappingRule.fromJSON(ruleState)` + `applyMappingRule(planeObjects, rule)` を実行
4. 結果を`results`状態に保存 → BatchConvertViewで表テーブル表示

**TODO**: 実際のPlaneObjectリストはcsv-importerから取得する仕組みが未実装。

---

## 5. アプリ設定（object-transformer-app）

### `src/registration/bubbleRoutes.tsx`

**役割**: URLパターンと画面コンポーネントの対応を定義する。

| URLパターン | 表示する画面 | パラメータ |
|------------|------------|-----------|
| `object-transformer/editor` | MappingEditorFeature（マッピングエディタ） | なし |
| `object-transformer/rules` | RuleListFeature（ルール一覧） | なし |
| `object-transformer/rules/:ruleId/convert` | BatchConvertFeature（一括変換） | `ruleId` |

各ルートコンポーネントは`TransformerProvider`でラップされている。

---

### `src/app/app.tsx`

**役割**: スタンドアロンモードでのアプリ全体の組み立て。

処理の順序:
1. `import TransformIcon` — サイドバー用のMUIアイコンをインポート
2. `import '@bublys-org/object-transformer-libs'` — transformerスライス注入（副作用）
3. `BubbleRouteRegistry.registerRoutes(...)` — バブルルートを登録
4. `menuItems` — サイドバーに「変換エディタ」「ルール一覧」メニューを定義

プロバイダー階層:
```
BublyStoreProvider（Reduxストア初期化 + redux-persist、persistKey: "object-transformer-standalone"）
  └─ TransformerProvider（スキーマ + ルール管理）
       └─ BublyApp（サイドバー + バブル表示エリア）
```

---

### `src/bubly.ts`

**役割**: bublys-os（メインアプリ）から動的にロードされるバブリとしての登録。

```typescript
const ObjectTransformerBubly: Bubly = {
  name: "object-transformer",
  version: "0.0.1",
  menuItems: [
    {
      label: "変換エディタ",
      url: "object-transformer/editor",
      icon: React.createElement(TransformIcon, { color: "action" }),
    },
  ],
  register(context) {
    context.registerBubbleRoutes(objectTransformerBubbleRoutes);
  },
  unregister() {},
};

registerBubly(ObjectTransformerBubly);
```

---

### `vite.config.bubly.ts`

**役割**: IIFE形式のバブリバンドルをビルドする設定。

```bash
npx vite build -c vite.config.bubly.ts
# → public/bubly.js を出力
```

**バンドル戦略**:
- **バンドルに含める**: `object-transformer-model`, `object-transformer-libs`, `react/jsx-runtime`
- **外部化（shared経由）**: `react`, `react-dom`, `@reduxjs/toolkit`, `react-redux`, `styled-components`, `@bublys-org/*`, `@mui/*`
- 外部化された依存は `window.__BUBLYS_SHARED__.*` のグローバル変数を参照

---

## 6. csv-importer側の変更（ドラッグ対応）

### `CsvObjectListView.tsx` の変更

リスト内の各`<li>`に`onDragStart`を追加:

```typescript
<li
  key={obj.id}
  className="e-item"
  onDragStart={(e) => {
    e.dataTransfer.setData("application/json", JSON.stringify(obj));
  }}
>
```

ObjectViewの標準ドラッグ（バブルURL）に加えて、`application/json`としてPlaneObjectのJSONデータも載せる。ObjectView内部の`draggable span`からイベントがバブリングしてくるため、`<li>`のハンドラでも`dataTransfer`にデータを追加できる。

### `CsvObjectDetailView.tsx` の変更

ObjectViewのラップは不適切（バブル自体のドラッグと競合する）なので、代わりにヘッダーにドラッグ可能なchipを追加:

```typescript
<span
  className="e-drag-chip"
  draggable
  onDragStart={handleDragStart}
  title="ドラッグして他のアプリにドロップ"
>
  ⠿ {object.name}
</span>
```

`handleDragStart`では`application/json`と`url`の両方をセット。

### `CsvObjectDetailFeature.tsx` の変更

`CsvObjectDetailView`に`objectUrl`プロパティを追加:

```typescript
<CsvObjectDetailView
  object={planeObject}
  objectUrl={`csv-importer/sheets/${sheetId}/objects/${rowId}`}
/>
```

---

## ファイル一覧（実装したもののみ）

```
object-transformer-model/
  src/lib/
    DomainSchema.ts           ← ドメインスキーマの型定義とクラス
    MappingRule.ts            ← マッピングルールの型定義とクラス
    transform.ts              ← 変換実行ロジック（PlaneObject[] → Record[]）
    suggest.ts                ← マッピング自動推定（スコアリング + エイリアス辞書）
    validate.ts               ← マッピング妥当性チェック
    transform.test.ts         ← transformのテスト（10ケース）
    suggest.test.ts           ← suggestのテスト（7ケース）
    schemas/
      staff-schema.ts         ← ハードコードのスタッフスキーマ
    index.ts                  ← エクスポート定義
  src/index.ts                ← パッケージエントリポイント
  jest.config.ts              ← テスト設定
  .spec.swcrc                 ← テスト用コンパイル設定

object-transformer-libs/
  src/slice/
    transformer-slice.ts      ← Reduxスライス（addRule/updateRule/deleteRule）
    index.ts                  ← エクスポート定義
  src/ui/
    SourcePanel.tsx            ← 左パネル（PlaneObjectプロパティ一覧、ドラッグ可能chip）
    TargetPanel.tsx            ← 右パネル（スキーマプロパティスロット、ドロップ受付）
    MappingEditorView.tsx      ← メイン2カラムレイアウト + 提案バー + 保存バー
    RuleListView.tsx           ← 保存済みルール一覧
    BatchConvertView.tsx       ← 一括変換UI + 結果テーブル
    index.ts                  ← エクスポート定義
  src/feature/
    TransformerProvider.tsx    ← スキーマ + ルール管理プロバイダー
    MappingEditorFeature.tsx   ← マッピングエディタのオーケストレーション
    RuleListFeature.tsx        ← ルール一覧のバブルナビゲーション
    BatchConvertFeature.tsx    ← 一括変換の実行ロジック（TODO: PlaneObject取得）
    index.ts                  ← エクスポート定義
  src/index.ts                ← パッケージエントリポイント

object-transformer-app/
  src/registration/
    bubbleRoutes.tsx          ← URLと画面の対応定義（3ルート）
    index.ts                  ← エクスポート定義
  src/app/
    app.tsx                   ← スタンドアロンアプリの組み立て
  src/
    bubly.ts                  ← メインアプリ組み込み用の登録
  vite.config.bubly.ts        ← バブリバンドルビルド設定（IIFE）
```

---

## 未実装・TODO

| 項目 | 状況 |
|------|------|
| BatchConvertFeatureのPlaneObject取得 | csv-importerからPlaneObjectリストを取得する仕組みが未実装（空配列プレースホルダー） |
| ターゲットスキーマの動的選択 | 現在はSTAFF_SCHEMA固定。将来的にはドロップやセレクタで選択可能にする |
| スキーマのネストプロパティ対応 | skills, presentation等のネスト構造は初期実装では省略 |
| MappingEditorFeatureのデバッグログ | 開発中のconsole.logが残存。動作確認後に削除予定 |

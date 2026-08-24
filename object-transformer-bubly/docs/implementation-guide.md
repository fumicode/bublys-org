# Object Transformer 実装ガイド

このドキュメントでは、Object Transformer バブリの実装内容を説明します。
自動生成されたファイル（package.json、tsconfig.json、vite.config.mts など）は除き、
**手書きで実装したファイル**のみを対象にしています。

---

## 全体像

Object Transformer は「異形式のデータを、任意のドメインオブジェクトの形に組み替える」バブリです。
3つのパッケージで構成されています:

```
object-transformer-model/   ← 変換ルール・スキーマ・変換ロジック（純粋 TypeScript）
object-transformer-libs/    ← 画面部品と Redux 保存
object-transformer-app/     ← 上記をまとめて Bubly エントリとして動かす
```

### v2 の中核: 汎用スキーマ受け入れ

以前は「ターゲット = Staff スキーマ決め打ち」でした。現在は **どんな型のオブジェクトを
ドロップしてもターゲットの構造を再現できる** ように書き換えられています。

データフロー:

```
[ソース側]                                [ターゲット側]
csv-importer の CsvObject をドロップ         hotel-shift-puzzle の Staff をドロップ
（application/json でデータも運ぶ）          （URL-only、登録済みスキーマから解決）
        ↓                                        ↓
        └──────── resolveDropped() ─────────────┘
              1. payload.type から登録済みスキーマを引く
              2. なければ application/json を推論
              3. どちらもなければドロップ失敗
        ↓
DomainSchema（再帰的な shape）を得る
        ↓
SourcePanel: リーフを平坦な chip リストで表示
TargetPanel: shape を再帰ツリー描画（object は入れ子表示、リーフは drop zone）
        ↓
リーフ間ドラッグ → FieldMapping（sourcePath.dot.notation → targetPath.dot.notation）
        ↓
suggestMappings が提案 → 適用
        ↓
ルール保存 → Redux（objectTransformer スライス）→ localStorage 永続化
        ↓
applyMappingRule(sources[], rule) → ネストしたオブジェクト配列
```

**キーとなる共通言語:** `SchemaShape`（`@bublys-org/domain-registry/schema`）が
バブリ横断で「型の中身」を伝える純粋型。各バブリはロード時に自分の型のスキーマを
`registerSchema('Staff', shape)` で登録するだけで、他のバブリから引ける。

---

## 1. ドメインモデル（object-transformer-model）

### `src/lib/DomainSchema.ts`

**役割**: ドロップされた型の構造を保持するアグリゲート。ルートは通常 `object` shape だが、
プリミティブや配列がルートに来ても許容する。

再帰的な shape（`SchemaShape`）は `@bublys-org/domain-registry/schema` の共通型を使う。

```typescript
type DomainSchemaState = {
  readonly id: string;         // 型名（kebab-case を想定）
  readonly name: string;       // 表示名（"Staff" 等）
  readonly root: SchemaShape;  // 再帰的な shape
};

class DomainSchema {
  constructor(readonly state: DomainSchemaState) {}

  get root(): SchemaShape;                                       // ルート shape
  get rootFields(): readonly SchemaField[];                       // ルートが object のとき直下フィールド
  get leafFields(): { path: string[]; field: SchemaField }[];    // 平坦化したリーフ（マッピング候補）
  getFieldAt(path: readonly string[]): SchemaField | undefined;  // path で解決

  toJSON(): DomainSchemaState;
  static fromJSON(json: DomainSchemaState): DomainSchema;
  static of(id: string, name: string, root: SchemaShape): DomainSchema;  // ショートカット
}
```

### `src/lib/MappingRule.ts`

**役割**: ソース → ターゲットのフィールド対応。dot-notation の path で表現する。

```typescript
type FieldMapping = {
  readonly sourcePath: string;   // "name" / "address.city" 等
  readonly targetPath: string;
  readonly transform: ValueTransform;
};

type ValueTransform =
  | { type: "identity" }
  | { type: "toNumber" }
  | { type: "toBoolean"; trueValues: string[] }
  | { type: "dictionary"; map: Record<string, string> };
```

`MappingRule` クラスは不変。`addMapping` / `removeMapping` が新インスタンスを返す。

### `src/lib/transform.ts`

**役割**: ソース配列を `MappingRule` に沿ってネストしたオブジェクト配列へ変換。

```typescript
function getAtPath(obj: unknown, path: readonly string[]): unknown;
function setAtPath(obj: Record<string, unknown>, path: readonly string[], value: unknown): void;
function applyTransform(value: unknown, t: ValueTransform): unknown;
function applyMappingRule(sources: unknown[], rule: MappingRule): Record<string, unknown>[];
```

`applyMappingRule` は各ソースについて mappings をたどり、`getAtPath` で読んで
`setAtPath` で書き込む。途中のオブジェクトは必要に応じて自動生成される。

### `src/lib/suggest.ts`

**役割**: ソースリーフとターゲットスキーマのリーフを突き合わせて、名前・エイリアス・
値パターンから最尤のマッピングを提案。

```typescript
type SourceLeaf = {
  readonly path: string;        // "name" / "user.email" 等
  readonly label?: string;
  readonly sampleValue?: unknown;
};

function suggestMappings(sources: SourceLeaf[], schema: DomainSchema): FieldMapping[];
```

内部はスコアリング → 貪欲法で 1:1 マッピング。ネスト対応で `address.city` → `city` も
拾える。エイリアス辞書は日本語ラベル（名前・メール・郵便番号 等）を含む。

### `src/lib/validate.ts`

**役割**: 単一マッピングの妥当性チェック（数値変換可否、enum の値範囲チェック）。

### `src/lib/index.ts`

外部 API のバレル。`@bublys-org/domain-registry/schema` のスキーマ共通型・関数を
model からも再エクスポートしているので、libs 層は `object-transformer-model` 1つを
import すれば足りる。

---

## 2. 機能・UI（object-transformer-libs）

### `src/slice/transformer-slice.ts`

**役割**: 保存済みルールを持つ Redux スライス（純粋リポジトリ）。

- `addRule` / `updateRule` / `deleteRule`
- `selectTransformerRules`
- `injectInto(rootReducer)` を副作用で実行し、bublys-os の store に自動注入

### `src/feature/TransformerProvider.tsx`

**役割**: ルール保存操作を Context 経由で子コンポーネントに提供。
以前は「利用可能スキーマ一覧」も持っていたが、スキーマはドロップ時に解決されるので、
現在は **ルール保存 API のみ** を提供する薄いラッパーになっている。

### `src/feature/MappingEditorFeature.tsx`

**役割**: マッピングエディタの中核。ドロップされたオブジェクトから DomainSchema を
解決し、Source/Target の状態を持ち、マッピング操作を UI に渡す。

#### resolveDropped(e)

汎用ドロップ解決関数。優先順位:

1. **登録済みスキーマ**: `parseDragPayload(e)` → `type/xxx` を得て → kebab に変換 →
   `getSchema(kebab)` にヒットすればそれを使う。
2. **推論**: `application/json` があれば `inferShape(raw)` で shape を推論。
3. どちらもなければ null。

戻り値は `DroppedSide`:

```typescript
type DroppedSide = {
  value: unknown;             // application/json 由来の生データ（無ければ空）
  schema: DomainSchema;        // 解決された DomainSchema
  label: string;               // 表示ラベル
  typeName: string | null;     // 登録済みの型名（無ければ null）
};
```

#### 状態と副作用

- `source`, `target` それぞれ `DroppedSide | null` を state で保持
- ドロップされたら再度 `suggestMappings` を走らせて提案リストを更新
- `handleMapField(sourcePath, targetPath)` は `target.schema.getFieldAt(...)` から
  ターゲットフィールドの shape を見て transform を自動推定
- `handleSaveRule(name)` は `MappingRule.create(name, target.typeName ?? id, mappings)`
  を dispatch

### `src/ui/SourcePanel.tsx`

**役割**: ソースリーフ一覧を chip で表示。draggable な atom として振る舞う。

props はほぼ path/label/sample の3つ組。ドロップ状態管理は feature 層に委任。

### `src/ui/TargetPanel.tsx`

**役割**: ターゲットスキーマの shape を **再帰ツリー** として描画。

- `ShapeTree` component が shape を再帰的に描く
- `kind === "object"` は入れ子の枠 `.e-branch` として表示
- リーフは `LeafFieldRow` として drop zone 兼マッピング状態表示
- ネストしたフィールドの path は `pathToString(prefix)` で dot-notation に

### `src/ui/MappingEditorView.tsx`

**役割**: Source/Target を並べて描画するプレゼンテーション層。
`sourceLabel`, `sourceLeaves`, `targetLabel`, `targetSchema` を props で受ける。

Source パネルからのフィールドドラッグは専用 MIME
`application/x-object-transformer-field` に sourcePath を載せる（外部の D&D ペイロード
と衝突しないようにする）。

### `src/feature/BatchConvertFeature.tsx` / `src/ui/BatchConvertView.tsx`

**役割**: 保存済みルールを使って複数ソースを一括変換して結果テーブルを表示。
`getAtPath(row, stringToPath(m.targetPath))` でネストしたターゲットからも値を引ける。

現状 `usePlaneObjects()` は空配列を返すプレースホルダ。csv-importer からの取得口は
今後の課題。

### `src/feature/RuleListFeature.tsx` / `src/ui/RuleListView.tsx`

**役割**: 保存済みルール一覧の CRUD。詳細な変更なし。

---

## 3. アプリ層（object-transformer-app）

### `src/bubly.ts`

**役割**: Bubly エントリ。universe first で登録される。

```typescript
const ObjectTransformerBubly: Bubly = {
  name: "object-transformer",
  version: "0.0.1",
  label: "変換エディタ",
  icon: <TransformIcon color="primary" />,
  initialBubbleUrls: ["object-transformer/editor"],
  backdropColor: "hsl(270, 30%, 22%)",
  register(context) {
    context.registerBubbleRoutes(objectTransformerBubbleRoutes);
  },
  unregister() {},
};
registerBubly(ObjectTransformerBubly);
```

`menuItems` を持たず、initialBubbleUrls で初期バブルを指定する universe first 方式。

### `src/registration/`

- `bubbleRoutes.tsx` — `object-transformer/editor`, `.../rules`, `.../rules/:ruleId/convert` の3ルート
- `bubbleUrls.ts` — URL ビルダー

---

## 4. バブリ横断のスキーマ規約

### `@bublys-org/domain-registry/schema`

Object Transformer が汎用化されたことで、domain-registry に新しく追加された純粋な
スキーマ層。React/DOM 依存なし。

- `SchemaShape` / `SchemaField` — 再帰的な値の形
- `objectShape` / `primitiveShape` / `arrayShape` / `enumShape` — ビルダー
- `walkLeafFields(shape)` — リーフを path 付きで平坦化
- `pathToString` / `stringToPath` — dot-notation 変換
- `getFieldAtPath(shape, path)` — path でフィールド解決
- `inferShape(value)` — 値から shape を推論（フォールバック用）
- `inferShapeFromInstance(obj)` — `state` プロパティがあればそこを推論
- `registerSchema(typeName, shape)` / `getSchema(typeName)` — グローバルレジストリ

型名は kebab-case に正規化されるので、"Staff" でも "staff" でも同じキーに解決される
（`ObjectTypeRegistry` の drag type と同じ規約）。

### 各バブリの登録手順

**例: hotel-shift-puzzle**

`objects/hotelObjects.tsx` の descriptor に `shape` を追加するだけ:

```typescript
Staff: {
  class: Staff,
  getId: (s) => s.id,
  icon: <PersonIcon fontSize="small" />,
  shape: objectShape([
    { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
    { name: "name", shape: primitiveShape("string"), required: true, label: "名前" },
    { name: "department", shape: primitiveShape("string"), required: false, label: "所属部署" },
  ]),
}
```

`registerObjects` が内部で `registerSchema(type, d.shape)` を呼ぶので、副作用 import
1つで登録が完了する。

---

## 5. D&D 規約

- **ソースが CSV 行のとき**: csv-importer が `<ObjectView type="CsvObject" ...>` で
  `type/csv-object` を、`onDragStart` で `application/json` に PlaneObject を、それぞれ
  同時に載せる。object-transformer は前者で失敗（未登録）して後者で推論する。
- **ソース/ターゲットがドメインインスタンスのとき**: `ObjectView` が `type/xxx` と URL
  を載せる。object-transformer は `getSchema('xxx')` で登録済みスキーマを引く。

**フィールド間ドラッグ（マッピング）** は専用 MIME
`application/x-object-transformer-field` を使うので、外部のドラッグと混線しない。

---

## 6. 今後の課題

- **BatchConvert のソース供給口**: 現状 `usePlaneObjects()` が空配列。csv-importer から
  実データを取得する仕組みを追加する必要がある
- **配列内リーフのマッピング**: 現状 `array` は shape の一種として扱われるが、要素の
  中身をマッピング対象にはできない
- **保存 後の書き戻し**: 変換結果を「元のドメインバブリのリポジトリに追加する」導線が
  まだない（例: 変換した Staff を hotel-shift-puzzle に save）
- **スキーマ推論の精度向上**: 現状は初回サンプルからしか推論しないので、複数サンプル
  から「常に present なフィールドは required」等の統計的推論を入れる余地がある

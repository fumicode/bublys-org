# バブリ間連携 復活プロジェクト — 現状把握レポート

作成日: 2026-08-14
対象: `csv-importer` / `object-transformer` ブランチの main への復活と、バブリ間連携（PlaneObject の D&D 受渡）の完成。

---

## 1. 全体像

- **分岐点**: `12f8af69` — csv-importer / object-transformer とも同じ分岐点。以降 main は **250 コミット** 進行
- 両ブランチのソースは **main には全く入っていない**（`dist/` や `bubly.js` のビルド成果物だけがローカルに残っている）
- object-transformer は csv-importer の続きとして切られており、**object-transformer ブランチ 1 本に両バブリのソースが揃っている**（csv-importer 側の D&D 送信実装もここにある）

---

## 2. csv-importer ブランチ

**規模**: 44 ファイル / 約 4,629 行 の新規追加。

### model 層: `CsvSheet`

- `state: { id, name, columns, rows, createdAt, updatedAt }` の不変クラス
- `addColumn/deleteColumn/renameColumn/addRow/deleteRow/updateCell` — すべて新インスタンスを返す
- **`toPlaneObject() / toPlaneObjects(titleColumnId)`** ← **バブリ間連携の中核**：CSV 行を `{ id: rowUUID, name, ...labelName→value }` の平坦オブジェクトに変換
- `toCsvText/toJSON/fromJSON/fromCsvText`
- テスト 16 本

### libs 層

- `csv-importer-slice`: `setSheet/deleteSheet/updateCell/addRow/…` の Redux slice + module augmentation で自動注入
- `CsvSheetProvider`: グローバルスコープ（メタ）＋シート個別スコープ（世界線グラフ）を管理、DomainRegistry に `"csv-sheet"` / `"csv-sheet-meta"` を登録
- `SheetEditorFeature`: `useCasScope(sheetScopeId(sheetId))` + `sheetShell.update(s => s.updateCell(...))` で編集を世界線に自動 commit
- `SheetListFeature` / `CsvObjectListFeature` / `CsvObjectDetailFeature` / `WorldLineFeature`
- `googleSheetsApi.ts` + `useGoogleSheetsAuth.ts`: OAuth（`VITE_GOOGLE_CLIENT_ID`）+ push/pull

### app 層

- `bubly.ts` name: `"csv-importer"`, menuItems: 「シート一覧」→ `csv-importer/sheets`
- ルート 5本: `sheets` / `sheets/:id` / `sheets/:id/objects` / `sheets/:id/objects/:rowId` / `sheets/:id/world-line`
- vite port: **4200**

---

## 3. object-transformer ブランチ（+ csv-importer への追記）

### model 層（純粋 TS、テストあり）

| 名前 | 責務 |
|---|---|
| `DomainSchema` | 変換先スキーマ（`state: readonly { id, name, properties[] }`） |
| `MappingRule` | ソースキー→ターゲットプロパティのマッピング集合 |
| `transform()` | PlaneObject[] → Record[] を実行する純粋関数 |
| `suggest()` | 名前/エイリアス/値パターンから自動推定 |
| `validate()` | スキーマ検証 |
| `schemas/staff-schema.ts` | サンプルの Staff スキーマ |

### libs 層

- `transformer-slice`: `addRule/updateRule/deleteRule`
- `MappingEditorFeature` + `MappingEditorView` + `SourcePanel`(左) + `TargetPanel`(右)
- `RuleListFeature/View`、`BatchConvertFeature/View`

### ★ バブリ間 D&D 連携（commit `9dd1f28`）

**送信（csv-importer 側 `CsvObjectDetailView.tsx`）**:

```tsx
<span draggable onDragStart={(e) => {
  e.dataTransfer.effectAllowed = "copy";
  e.dataTransfer.setData("application/json", JSON.stringify(planeObject));
}}>⠿ {planeObject.name}</span>
```

**受信（object-transformer 側 `MappingEditorFeature.tsx`）**:

```tsx
const handleDropSource = (e) => {
  const obj = JSON.parse(e.dataTransfer.getData("application/json"));
  if (!obj.id || typeof obj.name !== "string") return;
  setSourceObject(obj);
  if (targetSchema) setSuggestions(suggestMappings(Object.keys(obj), targetSchema, obj));
};
```

**特徴**: **ブラウザネイティブ DnD のみ**で完結。csv-importer は object-transformer を全く知らない疎結合。MIME type は `application/json`。

### 未完成として拾えた点

1. `handleDropTarget` で `setTargetSchemaId(STAFF_SCHEMA.id)` **ハードコード**。スキーマ選択 UI・自動判定なし
2. `targetSampleValues` を宣言だけして未使用
3. transform 型推定に日付フォーマットや辞書型変換なし
4. パース失敗の `catch {}` が黙殺（デバッグしづらい）
5. スキーマ側の管理 UI（新規スキーマ作成/インポート）が薄い

---

## 4. main への統合で予想される衝突ホットスポット

| 優先度 | 領域 | 内容 | 対処方針 |
|---|---|---|---|
| **高** | `apps/bublys-os/app/[[...slug]]/` + URL 文法 | main は `universe@<node>` に統一済み。ネスト URL は親バブルの url に乗る新モデル | 両ブランチが独自 URL parse をしていれば全面置換 |
| **高** | `bublys-libs/bubbles-ui/src/lib/world-line/` | `useUniverseArrangementWorldLine` / `useRootArrangementWorldLine` 追加。CAS+IndexedDB のじゃがいもモデル | world-line-graph の API が変わっているので `shell.update` の呼び方等を再確認 |
| **高** | `bublys-libs/bubbles-ui/src/lib/bubly/` | 動的ロード（`registerBubly` / `BublyLoader` / `makeBublyRoute`）が整備。サイドバー自動生成・universe バブル自動化 | 両ブランチの登録が古い `BubbleRouteRegistry` 直登録なら新形式へ移植 |
| **中** | Redux slice 規約 | 「スライスは集約のリポジトリに徹する」が明文化（`update` で ID 丸ごと置換） | csv-importer-slice の `updateCell/addRow/…` は本来 CsvSheet メソッドで、slice には `updateSheet` だけ持たせるべき ⇒ **リファクタ推奨** |
| **中** | D&D と再帰 universe | 奥のレイヤーは CSS scale されている。バブル跨ぎの座標計算に `parentScale` が必要 | ブラウザネイティブ DnD は座標変換不要なのでたぶんそのまま動くが、`ObjectView` 側の変化を要確認 |
| **中** | universe の `initialBubbleUrls` / `backdropColor` | main は bubly が universe バブルを自動発行する仕様。csv-importer / object-transformer は `menuItems` だけで universe を持たない可能性 | `bubly.ts` に `initialBubbleUrls` と `backdropColor` を追加、universe を1バブリ=1窓に |
| 低 | ObjectView API | 変更少ないが軽く突き合わせ | 差分あればここで拾う |

---

## 5. 復活の全体戦略

object-transformer ブランチ上で作業する前提。素直な merge は 250 コミットの衝突で破綻する可能性が高いので、**「main を優先で merge → 両バブリを手動で main の新 API に合わせて書き直し」** で進める。

### 手順

1. **main を優先で merge**（`git merge main -X theirs`）
   - main の 250 コミットを取り込む
   - 共有ファイルの衝突は main 版を採用
   - csv-importer-bubly/ / object-transformer-bubly/ は新規追加ファイルなので保持される
2. **bubly.ts を新形式へ書き換え**（`registerBubly` + `initialBubbleUrls` + `backdropColor` + universe 動作確認）
3. **world-line-graph まわりの API 追従**（`useCasScope` の使い方、`shell.update` の signature）
4. **Redux slice の集約リポジトリ化リファクタ**（`updateCell` 等をドメインメソッドに寄せる → 現規約適合）
5. **D&D の疎通確認**（bublys-os で csv-importer → object-transformer の D&D が動くか）
6. **未完成部分の完成**：スキーマ選択 UI・sampleValues 反映・エラーハンドリング・自動推定の強化

---

## 6. 未解決の判断事項

1. **未踏応募資料**（`未踏/未踏アドバンスト応募資料.md`, 237行）が object-transformer ブランチ上にある。今も参考にする内容か？
2. Google Sheets 連携（`VITE_GOOGLE_CLIENT_ID`）は復活対象に含めるか？それとも当面ローカル CSV だけで OK か？
3. object-transformer のターゲットスキーマは、当面 **Staff 固定**でよいか？それとも hotel-shift-puzzle の Staff にドロップして局員を登録＝**hotel-shift-puzzle の Staff 型を DomainSchema 化して受け皿にする**のがゴールか？

---

## 7. 主要ファイル索引

### csv-importer ブランチ

```
csv-importer-bubly/
├── csv-importer-model/src/lib/
│   ├── CsvSheet.ts               # 集約ドメインクラス
│   └── CsvSheet.test.ts
├── csv-importer-libs/src/
│   ├── slice/csv-importer-slice.ts
│   ├── feature/
│   │   ├── CsvSheetProvider.tsx       # DomainRegistry 登録、スコープ管理
│   │   ├── SheetEditorFeature.tsx     # 世界線 + Google Sheets 同期
│   │   ├── SheetListFeature.tsx
│   │   ├── CsvObjectListFeature.tsx
│   │   ├── CsvObjectDetailFeature.tsx
│   │   ├── WorldLineFeature.tsx
│   │   ├── googleSheetsApi.ts
│   │   └── useGoogleSheetsAuth.ts
│   └── ui/
│       ├── SheetEditorView.tsx
│       ├── SheetListView.tsx
│       ├── CsvObjectListView.tsx      # ★D&D 送信元
│       ├── CsvObjectDetailView.tsx    # ★D&D 送信元（詳細版）
│       ├── WorldLineView.tsx
│       └── GoogleSheetsPanel.tsx
└── csv-importer-app/src/
    ├── bubly.ts
    ├── registration/bubbleRoutes.tsx
    └── vite.config.mts (port: 4200)
```

### object-transformer ブランチ（追加分）

```
object-transformer-bubly/
├── docs/implementation-guide.md          # commit 66c01f52
├── object-transformer-model/src/lib/
│   ├── DomainSchema.ts
│   ├── MappingRule.ts
│   ├── transform.ts + transform.test.ts
│   ├── suggest.ts + suggest.test.ts
│   ├── validate.ts
│   └── schemas/staff-schema.ts
├── object-transformer-libs/src/
│   ├── slice/transformer-slice.ts
│   ├── feature/
│   │   ├── MappingEditorFeature.tsx     # ★D&D 受信中核
│   │   ├── BatchConvertFeature.tsx
│   │   ├── RuleListFeature.tsx
│   │   └── TransformerProvider.tsx
│   └── ui/
│       ├── MappingEditorView.tsx
│       ├── SourcePanel.tsx              # ドロップ受け入れ
│       ├── TargetPanel.tsx
│       ├── RuleListView.tsx
│       └── BatchConvertView.tsx
└── object-transformer-app/src/
    ├── bubly.ts
    └── registration/bubbleRoutes.tsx
```

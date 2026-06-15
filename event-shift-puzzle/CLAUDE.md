# event-shift-puzzle — 開発者ガイド

技大祭のシフト管理・配置最適化のための Bubly アプリケーション。

---

## 思想・設計哲学

### 「シフト案」を中心に考える

シフトパズルは「何人をいつ・どのタスクに配置するか」を解くパズルです。
ドメインの中心は **ShiftPlan（シフト案）** であり、一つの案を試行錯誤しながら編集します。

- **BlockList**（15分解像度のセル配置）が配置データの唯一の真実
- 旧 D&D UI（Assignment ベース）は削除済み。すべての配置操作は BlockList ベース
- シフト案は世界線グラフで履歴管理され、過去の状態に戻れる

### バブルナビゲーション

「バブル」はこのアプリの UI 単位です。URL パターンで識別され、横に展開・重ね合わせることで
コンテキストを保ちながら複数の情報を同時に表示できます。

```
shift-plan-list
  └─ primitive-gantt（シフト案を開く）
       ├─ shift-status（シフトをダブルクリック）
       │    ├─ shift-status/members（昇格）
       │    └─ shift-status/coverage（昇格）
       ├─ task-gantt（タスクガントを開く）
       │    └─ shift-status / task / history / member
       └─ history（世界線グラフ）
```

### ダブルクリックでバブルを開く（ObjectView）

`ObjectView` コンポーネントにオブジェクト型と URL を渡すだけで、
ダブルクリック時のバブル展開が自動で動作します。

```typescript
// object-type-registration.ts で登録
registerObjectBubble('Member', { openingPosition: 'bubble-side' });

// UI 側はこれだけ
<ObjectView type="Member" url={buildMemberUrl(member.id)} label={member.name}>
  {children}
</ObjectView>
```

`openBubble` を個別に呼ぶコードは書かない。登録 → ObjectView に任せる。

### CurrentBubbleContext

`BubbleContent` が現在のバブル ID を `CurrentBubbleContext` で provide しています。
`ObjectView` がこれを参照することで「どのバブルから開いたか」を自動追跡します。
コンポーネント側でバブル ID を受け取る props は不要です。

---

## モノレポ構造

```
event-shift-puzzle/
  event-shift-puzzle-model/   # ドメイン層（純粋 TypeScript、外部依存なし）
  event-shift-puzzle-libs/    # 機能・UI 層（React + Redux）
  event-shift-puzzle-app/     # アプリ層（バブルルート登録、エントリーポイント）
```

### 依存方向

```
event-shift-puzzle-model（依存なし）
    ↑
event-shift-puzzle-libs（model + bubbles-ui + state-management）
    ↑
event-shift-puzzle-app（libs + bubbles-ui）
```

---

## ドメインモデル

### コアエンティティ

| クラス | 責務 |
|---|---|
| `ShiftPlan` | シフト案。Shift 一覧・TimeSchedule・配置データ(BlockList)を保持 |
| `Shift` | 「いつ・何の役割を・何人で」の定義。BlockList を内包 |
| `TimeSchedule` | 1日の時間枠（DayType・開始〜終了時刻） |
| `BlockList` | 15分解像度の配置データ。`blocks[blockIndex][userId[]]` |
| `Member` | 局員。参加可能時間帯（availability）を保持 |
| `Task` | タスクマスター（役割定義） |
| `ShiftAssignmentStatus` | BlockList から充足・違反を計算する値オブジェクト |

### 重要な設計ルール

- **ドメインクラスは不変**。更新メソッドは `new MyClass({ ...this.state, field: newValue })` を返す
- **状態は `state` オブジェクトを介して管理**する
  ```typescript
  class Shift {
    constructor(readonly state: ShiftState) {}
    addUser(blockIndex: number, userId: string): Shift {
      // BlockList を更新した新しい Shift を返す
    }
  }
  ```
- **BlockList の解像度は常に15分**。TimeSchedule スコープで相対インデックス

---

## Redux スライス

| スライス | 管理対象 |
|---|---|
| `shift-plan-slice` | ShiftPlan[] + currentShiftPlanId |
| `shift-puzzle-slice` | Member[] + selectedMemberId + ShiftPreference[] |
| `task-slice` | Task[] + selectedTaskId |

### 主要アクション（BlockList 操作）

```typescript
// 単一ブロックに局員を追加
dispatch(addUserToBlock({ planId, shiftId, blockIndex, userId }))

// 連続範囲に追加（ドラッグ確定時）
dispatch(addUserToBlockRange({ planId, shiftId, startBlock, endBlock, userId }))

// ブロックを移動・リサイズ
dispatch(moveUserBlocks({ planId, shiftId, newShiftId, oldUserId, oldStart, oldEnd, newUserId, newStart, newEnd }))

// 世界線ノードから復元
dispatch(restoreShiftPlanFromWorldLine({ planId, shifts }))
```

---

## バブルルート一覧

| URL パターン | 機能 |
|---|---|
| `shift-puzzle/shift-plans` | シフト案一覧（エントリー） |
| `shift-puzzle/shift-plans/:id/primitive-gantt` | セルグリッドガント |
| `shift-puzzle/shift-plans/:id/task-gantt` | タスク軸ガント |
| `shift-puzzle/shift-plans/:id/shifts/:shiftId/status` | 配置状況（統合） |
| `shift-puzzle/shift-plans/:id/shifts/:shiftId/status/members` | 配置メンバーのみ |
| `shift-puzzle/shift-plans/:id/shifts/:shiftId/status/coverage` | 充足テトリスのみ |
| `shift-puzzle/shift-plans/:id/history` | 世界線グラフ |
| `shift-puzzle/members` | 局員一覧（エントリー） |
| `shift-puzzle/members/filter` | 局員フィルター検索 |
| `shift-puzzle/members/:memberId` | 局員詳細 |
| `shift-puzzle/members/:memberId/availableShifts` | 参加可能シフト |
| `shift-puzzle/tasks` | タスク一覧（エントリー） |
| `shift-puzzle/tasks/filter` | タスクフィルター検索 |
| `shift-puzzle/tasks/:taskId` | タスク詳細 |

---

## 現在の開発フォーカス

**エントリーポイントは3つ：**
1. `shift-puzzle/shift-plans` — シフト案一覧から始まる配置編集
2. `shift-puzzle/members` — 局員一覧から始まる局員管理
3. `shift-puzzle/tasks` — タスク一覧から始まるタスク管理

---

## 新機能の追加方法

### 1. ドメインモデルの変更（event-shift-puzzle-model）

```typescript
// lib/ に新クラスを追加
class NewDomainObject {
  constructor(readonly state: NewDomainObjectState) {}
  someMethod(): NewDomainObject {
    return new NewDomainObject({ ...this.state, field: newValue });
  }
}
```

ビルド確認：
```bash
cd event-shift-puzzle/event-shift-puzzle-model
npm run build
```

### 2. Redux スライスにアクションを追加（event-shift-puzzle-libs/src/slice/）

```typescript
// 既存スライスにアクションを追加
const mySlice = createSlice({
  reducers: {
    newAction: (state, action: PayloadAction<{ ... }>) => {
      // immer で直接変更
    }
  }
});
```

### 3. UI コンポーネントを作成（event-shift-puzzle-libs/src/ui/）

```typescript
// プレゼンテーショナルコンポーネント
// Redux を直接使わない。props で受け取る
export const MyView: FC<MyViewProps> = ({ data, onAction }) => { ... };
```

### 4. Feature コンポーネントを作成（event-shift-puzzle-libs/src/feature/）

```typescript
// Redux と UI を接続する
export const MyFeature: FC<MyFeatureProps> = ({ ... }) => {
  const data = useAppSelector(selectMyData);
  const dispatch = useAppDispatch();
  return <MyView data={data} onAction={...} />;
};
```

### 5. バブルルートに登録（event-shift-puzzle-app/src/registration/bubbleRoutes.tsx）

```typescript
const MyFeatureBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <MyFeature id={bubble.params.id} />;
};

// shiftPuzzleBubbleRoutes 配列に追加
{ pattern: "shift-puzzle/my-feature/:id", type: "my-feature", Component: MyFeatureBubble },
```

### 6. ObjectView でダブルクリック展開を設定（event-shift-puzzle-libs/src/object-type-registration.ts）

```typescript
// 新しいオブジェクト型を登録
registerObjectType('MyType', <MyIcon fontSize="small" />);
registerObjectBubble('MyType', { openingPosition: 'bubble-side' });
```

UI 側では `<ObjectView type="MyType" url={...}>` とするだけで自動展開。

---

## サンプルデータについて

`event-shift-puzzle-libs/src/data/` に技大祭向けのマスターデータが定義されています。

```typescript
// DayType: '準準備日' | '準備日' | '1日目' | '2日目' | '片付け日'
const shifts = createDefaultShifts();         // ~150 シフト定義
const members = createSampleMemberList();     // サンプル局員
const tasks = createSampleTasks();            // タスクマスター
const timeSchedules = createDefaultTimeSchedules();
```

新しいイベントへの転用時は `sampleData.ts` を差し替えれば動きます。

---

## 新しい Bubly プロジェクトとして分ける際のガイド

### ディレクトリ構成のテンプレート

```
your-event-bubly/
  your-event-model/       # ← event-shift-puzzle-model を元にドメインを再設計
  your-event-libs/        # ← event-shift-puzzle-libs を元に feature/ui を実装
  your-event-app/         # ← event-shift-puzzle-app を元にルート登録
```

### 最小構成で始める手順

1. **`event-shift-puzzle-model` をコピーしてドメインを整理**
   - イベント固有のドメインクラスを追加・変更

2. **Redux スライスを定義**（`your-event-libs/src/slice/`）
   - `injectInto(rootReducer)` で bublys-os の store に注入

3. **3つのエントリーポイントバブルを実装**
   - リスト系コンポーネント（例：plan-list, member-list, item-list）

4. **`object-type-registration.ts` を作成**
   - `registerObjectType` + `registerObjectBubble` で型を登録

5. **`bubbleRoutes.tsx` を作成**
   - `shiftPuzzleBubbleRoutes` と同様の配列を export

6. **bublys-os の `BubbleRouteRegistry` に登録**
   ```typescript
   // apps/bublys-os/.../bubbleRoutes.ts
   import { yourEventBubbleRoutes } from '@your-org/your-event-app';
   BubbleRouteRegistry.registerRoutes(yourEventBubbleRoutes);
   ```

### 転用できるパターン

| パターン | 転用先 |
|---|---|
| BlockList（15分解像度セル） | 会場レイアウト、席割り、スケジューラー全般 |
| ShiftAssignmentStatus（充足計算） | リソース配置の充足判定全般 |
| ObjectView ダブルクリック展開 | どんなオブジェクトのドリルダウンにも使える |
| 世界線グラフ | 状態履歴・バージョン管理が必要な任意のデータ |
| フィルターバブルパターン（MemberFilter 等） | 任意のリストの絞り込み UI |

---

## コマンド

```bash
# ドメインモデルのビルド確認
cd event-shift-puzzle/event-shift-puzzle-model && npm run build

# アプリの開発サーバー起動（bublys-os 経由）
npx nx dev bublys-os

# テスト
npx nx test event-shift-puzzle-libs
```

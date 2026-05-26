# AI自動配置アルゴリズム

シフトパズルには2種類のAI自動配置機能がある。いずれもスコアベースのグリーディーアルゴリズムで、
15分ブロック単位の `BlockList` を埋めていく。

## ソースファイル

| ファイル | 関数 |
|---|---|
| `src/feature/aiShiftPlacement.ts` | `computeAiPlacements` |
| `src/feature/aiMemberPlacement.ts` | `computeAiMemberPlacements` |

---

## 共通データ構造

### BlockList（15分ブロック配列）

```
blocks[blockIndex] = string[]  // そのブロックに配置された userId の配列
```

- `blockIndex 0` = `TimeSchedule.startMinute`（例: 540 = 09:00）
- 各ブロック = 15分
- 複数局員が同じブロックに入れる（シフトの `requiredCount` まで）

### validBlockRange

シフトの開始・終了時刻を TimeSchedule の座標系に変換した `{start, end}` 半開区間。
ガントのブラシ緑表示と同じ範囲条件。

### AiPlacementAction（出力型）

```typescript
type AiPlacementAction = {
  shiftId: string;
  memberId: string;
  startBlock: number;
  endBlock: number;  // 半開区間 [startBlock, endBlock)
};
```

---

## AIシフト配置（`computeAiPlacements`）

**用途:** TaskCollection → PrimitiveGanttEditor へのドロップ。
ドラッグしたタスク群に対応するシフトへ、最適な局員を自動配置する。

### 入力

| 引数 | 説明 |
|---|---|
| `taskGroups` | ドラッグされたタスクのグループ（`GroupedTask[]`） |
| `planShifts` | シフト表の全シフト |
| `members` | 全局員 |
| `activeTimeSchedule` | 表示中のタイムスケジュール |

### イテレーション軸

```
タスクグループ
  └─ 対応シフト（taskId で絞り込み）
       └─ ブロック b（validBlockRange 内）
            └─ 候補局員（スコア降順）→ 空きに配置
```

### スコア関数 `scoreMember(member, shift)`

| 条件 | 加点 |
|---|---|
| `member.department === shift.responsibleDepartment` | +5 |
| `member.isNewMember === true` | −3 |

スコア降順に並べた局員を順番に試し、条件を満たした局員から埋める。
スコアが高い局員が優先的にシフトへ入る。

---

## AIメンバー配置（`computeAiMemberPlacements`）

**用途:** MemberCollection → TaskGanttEditor へのドロップ。
ドラッグした局員群を、表示中のシフト行へ自動配置する。
AIシフト配置の対称実装（タスク→局員 の軸を逆転させたもの）。

### 入力

| 引数 | 説明 |
|---|---|
| `memberIds` | ドラッグされた局員IDリスト |
| `allShifts` | シフト表の全シフト（クロスシフト重複チェック用） |
| `targetShifts` | 配置対象シフト（TaskGanttEditor の visibleShifts） |
| `members` | 全局員 |
| `activeTimeSchedule` | 表示中のタイムスケジュール |

### イテレーション軸

```
局員（ドラッグされた順）
  └─ シフト（当該局員へのスコア降順）
       └─ ブロック b（validBlockRange 内）
            → 空きがあれば配置
```

### スコア関数 `scoreShiftForMember(member, shift)`

AIシフト配置と同じ係数だが、用途が逆。
局員ごとに「どのシフトへ優先的に入るか」を決める。

| 条件 | 加点 |
|---|---|
| `member.department === shift.responsibleDepartment` | +5 |
| `member.isNewMember === true` | −3 |

スコアが高いシフトから先に埋めるため、部署一致のシフトへ優先配置される。
新入生は（新入生が不利なシフトより先に）経験値不要なシフトから入る。

---

## 共通制約（両アルゴリズム共通）

### 1. 既存配置の保持

空きスロットのみ埋める。`slotsNeeded = requiredCount - existing.length` が 0 以下のブロックはスキップ。

### 2. 参加可否チェック

```typescript
member.isAvailableAt(shift.dayType, blockMinute)
```

`blockMinute = activeTimeSchedule.startMinute + b * 15` で計算した絶対分を用いる。
局員の参加可能時間帯外のブロックには配置しない。

### 3. クロスシフト重複禁止（既存 BlockList）

```typescript
allShifts
  .filter(s => s.id !== shift.id)
  .some(s => s.blockList.getUsersAt(b).includes(member.id))
```

同一ブロックに同一局員が複数シフトで入ることを禁止する。
`allShifts`（全シフト）を参照するため、表示外のシフトとの衝突も検出できる。

### 4. クロスシフト重複禁止（今回の AI 実行内）

```typescript
plannedMap.get(member.id)?.has(b)
// plannedMap: Map<memberId, Set<blockIndex>>
```

まだ Redux に dispatch していない「今回の配置予定」も追跡し、
同一 AI 実行内でのクロスシフト重複を防ぐ。

### 5. スロット過剰配置の防止（AIメンバー配置のみ）

AIメンバー配置は局員を外側ループで回すため、同一 (shift, block) に複数局員を配置する際に
Redux の既存カウントが更新前のままになる。`shiftBlockPending` でこれを補正する。

```typescript
// "shiftId::blockIndex" → 今回の AI 実行で追加予定の人数
const totalFilled = existing.length + (shiftBlockPending.get(pendingKey) ?? 0);
const slotsNeeded = shift.requiredCount - totalFilled;
```

AIシフト配置は「同一ブロックへの同一局員の重複」を `existing.push()` で防いでいるが、
「複数局員が同ブロックを争う」ケースは内側ループの `filled >= slotsNeeded` で制御しているため
同様の問題が起きない。

---

## 後処理：`consolidateToRanges`

ブロック単位のフラットリストを連続した半開区間（ラン）に圧縮する。

```
入力: [{shiftId, memberId, blockIndex: 5}, {…, blockIndex: 6}, {…, blockIndex: 8}]
出力: [{shiftId, memberId, startBlock: 5, endBlock: 7},
       {shiftId, memberId, startBlock: 8, endBlock: 9}]
```

`${shiftId}::${memberId}` をキーにグループ化し、連続するインデックスを1つのランに統合。
Redux の `addUserToBlockRange` は半開区間 `[startBlock, endBlock)` を受け取るため、
`endBlock = runPrev + 1` とする。

---

## データフロー

```
ドラッグ終了（D&D drop）
  ↓
computeAiPlacements / computeAiMemberPlacements
  ↓
AiPlacementAction[]
  ↓
dispatch(addUserToBlockRange({ planId, shiftId, startBlock, endBlock, userId }))
  ↓
Redux store / BlockList 更新
  ↓
ガントビュー再レンダリング
```

---

## 対称性まとめ

| | AIシフト配置 | AIメンバー配置 |
|---|---|---|
| **操作** | TaskCollection → PrimitiveGanttEditor | MemberCollection → TaskGanttEditor |
| **ガント軸** | Y軸 = 局員 | Y軸 = シフト(タスク) |
| **固定側** | ドラッグしたタスク（配置先シフトが確定） | ドラッグした局員（配置する人が確定） |
| **選択側** | 局員をスコア順に選ぶ | シフトをスコア順に選ぶ |
| **外側ループ** | タスク → シフト | 局員 |
| **内側ループ** | ブロック → 候補局員 | シフト → ブロック |
| **追加追跡** | `existing.push()` + `plannedMap` | `shiftBlockPending` + `plannedMap` |
